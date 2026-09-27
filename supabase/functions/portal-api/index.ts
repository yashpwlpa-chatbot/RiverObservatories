// Supabase Edge API for the public observatory and protected staff tools.
// All database calls use the service role here; the browser only has a publishable key.
const base = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const jsonHeaders = { 'Content-Type': 'application/json' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };

type Profile = { id: string; email: string; name: string; role: 'ADMIN' | 'RESEARCHER' | 'VIEWER'; active: boolean; createdAt: string };
class HttpError extends Error { constructor(public status: number, message: string, public code = 'REQUEST_ERROR') { super(message); } }
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status, headers: { ...jsonHeaders, ...cors } });
const failure = (error: unknown) => {
  const e = error instanceof HttpError ? error : new HttpError(500, error instanceof Error ? error.message : 'Unexpected server error');
  return new Response(JSON.stringify({ success: false, error: { code: e.code, message: e.status >= 500 ? 'The research service could not complete this request.' : e.message } }), { status: e.status, headers: { ...jsonHeaders, ...cors } });
};

async function serviceFetch(route: string, method = 'GET', body?: unknown, extraHeaders: Record<string,string> = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...(body === undefined ? {} : jsonHeaders), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(response.status, result?.message ?? result?.msg ?? result?.error_description ?? result?.error ?? 'Database request failed', result?.code ?? 'DATABASE_ERROR');
  return result;
}
const query = (table: string, params: Record<string,string> = {}) => serviceFetch(`/rest/v1/${table}?${new URLSearchParams(params)}`);
const rpc = (name: string, args: Record<string,unknown>) => serviceFetch(`/rest/v1/rpc/${name}`, 'POST', args);
const insert = (table: string, value: Record<string,unknown>) => serviceFetch(`/rest/v1/${table}`, 'POST', value, { Prefer: 'return=representation' }).then((r) => r[0]);
const update = (table: string, id: string, value: Record<string,unknown>) => serviceFetch(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, 'PATCH', value, { Prefer: 'return=representation' }).then((r) => r[0]);
const remove = (table: string, id: string) => serviceFetch(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, 'DELETE');
const first = async (table: string, params: Record<string,string>) => (await query(table, { ...params, limit: '1' }))[0] ?? null;

async function caller(req: Request): Promise<Profile | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new HttpError(401, 'Session expired. Sign in again.', 'UNAUTHORIZED');
  const identity = await response.json();
  const profile = await first('User', { select: 'id,email,name,role,active,createdAt', id: `eq.${identity.id}` });
  if (!profile || !profile.active) throw new HttpError(403, 'This account is not active.', 'FORBIDDEN');
  return profile;
}
function requireRole(user: Profile | null, ...roles: Profile['role'][]) {
  if (!user) throw new HttpError(401, 'Sign in to access this area.', 'UNAUTHORIZED');
  if (!roles.includes(user.role)) throw new HttpError(403, 'Your account cannot access this area.', 'FORBIDDEN');
  return user;
}
const publishedOnly = (user: Profile | null) => !user || user.role === 'VIEWER';
const fields = (input: Record<string,unknown>, allowed: string[]) => Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
const geoTables: Record<string,{ table: string; fields: string[]; select: string }> = {
  rivers: { table: 'River', fields: ['name','slug','description','origin','lengthKm','basinAreaKm2','metadata'], select: 'id,name,slug,description,origin,lengthKm,basinAreaKm2,createdAt' },
  states: { table: 'State', fields: ['name','code'], select: 'id,name,code' },
  districts: { table: 'District', fields: ['name','stateId'], select: 'id,name,stateId' },
  'river-stretches': { table: 'RiverStretch', fields: ['name','riverId','stateId','districtId','fromKm','toKm','description'], select: 'id,name,riverId,stateId,districtId,fromKm,toKm,description' },
  stations: { table: 'MonitoringStation', fields: ['name','code','riverId','stateId','districtId','riverStretchId','latitude','longitude','elevationM','active','metadata'], select: 'id,name,code,riverId,stateId,districtId,riverStretchId,latitude,longitude,elevationM,active' },
};
const hydrologyKeys = ['riverId','stateId','districtId','riverStretchId','stationId','parameterId','dataType','dataSubType','season','year','yearTo','month','dateFrom','dateTo'];
const filters = (params: URLSearchParams) => Object.fromEntries(hydrologyKeys.filter((key) => params.has(key)).map((key) => [key, params.get(key)]));

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i+1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i+1] === '\n') i++;
      row.push(value); if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  if (quoted) throw new HttpError(400, 'The Google Sheet contains an unclosed quoted cell.');
  row.push(value); if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

const inferredMapping = (headers: string[]) => {
  const match = (terms: string[]) => headers.find((header) => terms.some((term) => header.toLowerCase().replace(/[_-]/g,' ').trim() === term)) ?? '';
  return { river: match(['river','river name']), state: match(['state','state name']), district: match(['district','district name']), station: match(['station','station name','site']), date: match(['date','observation date','observed at']), value: match(['value','measurement','reading']), dataType: match(['data type','type']), parameter: match(['parameter','variable']), unit: match(['unit','units']), season: match(['season']) };
};

async function datasetRows(user: Profile | null, id?: string) {
  const params: Record<string,string> = { select: 'id,name,slug,description,status,dataType,units,methodology,sourceId,riverId,createdById,dateFrom,dateTo,createdAt,updatedAt', order: 'createdAt.desc' };
  if (id) params.id = `eq.${id}`;
  if (publishedOnly(user)) params.status = 'eq.PUBLISHED';
  const rows = await query('Dataset', params);
  const [rivers, sources, users, counts] = await Promise.all([
    query('River', { select: 'id,name,slug' }), query('DataSource', { select: 'id,name,type,url' }), query('User', { select: 'id,name' }), rpc('wct_dataset_counts', {}),
  ]);
  return rows.map((d: Record<string,unknown>) => ({ ...d,
    recordCount: Number(counts.find((c: {datasetId:string}) => c.datasetId === d.id)?.recordCount ?? 0),
    river: rivers.find((r: {id:string}) => r.id === d.riverId) ?? null,
    source: sources.find((s: {id:string}) => s.id === d.sourceId) ?? null,
    createdBy: users.find((u: {id:string}) => u.id === d.createdById) ?? null,
  }));
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/portal-api/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const method = req.method;
  const user = await caller(req);
  const body = method === 'POST' || method === 'PATCH' ? (req.headers.get('content-type')?.includes('application/json') ? await req.json() : null) : null;

  if (path === '/health' && method === 'GET') return ok({ service: 'portal-api', status: 'ok' });
  if (path === '/auth/me' && method === 'GET') return ok(requireRole(user,'ADMIN','RESEARCHER','VIEWER'));

  if (parts[0] === 'rivers') {
    if (method === 'GET') {
      if (!parts[1]) return ok(await rpc('wct_portal_rivers', { published_only: publishedOnly(user) }));
      const river = await rpc('wct_portal_river', { identifier: parts[1], published_only: publishedOnly(user) });
      if (!river) throw new HttpError(404, 'River not found.', 'NOT_FOUND');
      return ok(river);
    }
    requireRole(user,'ADMIN');
    const config = geoTables.rivers;
    if (method === 'POST') return ok(await insert('River', { id: uid(), ...fields(body ?? {}, config.fields), createdAt: now(), updatedAt: now() }), 201);
    if (method === 'PATCH' && parts[1]) return ok(await update('River', parts[1], { ...fields(body ?? {}, config.fields), updatedAt: now() }));
    if (method === 'DELETE' && parts[1]) { await remove('River', parts[1]); return new Response(null, { status: 204, headers: cors }); }
  }

  if (parts[0] === 'hydrology') {
    const category = parts[1] ?? '';
    if (method !== 'GET') throw new HttpError(405, 'Method not allowed.');
    if (category === 'filters') {
      const f = filters(url.searchParams);
      const [data, states, districts, stretches, stations] = await Promise.all([
        rpc('wct_filter_options', { f, published_only: publishedOnly(user) }),
        query('State', { select: 'id,name,code', order: 'name.asc' }),
        query('District', { select: 'id,name,stateId', order: 'name.asc' }),
        query('RiverStretch', { select: 'id,name,riverId,stateId,districtId', ...(f.riverId ? { riverId: `eq.${f.riverId}` } : {}) }),
        query('MonitoringStation', { select: 'id,name,code,riverId,stateId,districtId,riverStretchId,latitude,longitude,active', ...(f.riverId ? { riverId: `eq.${f.riverId}` } : {}) }),
      ]);
      return ok({ ...data, states, districts: f.stateId ? districts.filter((d: {stateId:string}) => d.stateId === f.stateId) : districts, stretches, stations });
    }
    if (['summary','timeseries','annual','monthly','seasonal','heatmap'].includes(category)) {
      return ok(await rpc('wct_hydrology_metrics', { f: filters(url.searchParams), kind: category, granularity: url.searchParams.get('granularity') ?? 'month', published_only: publishedOnly(user) }));
    }
    if (category === 'distribution') return ok(await rpc('wct_hydrology_distribution', { f: filters(url.searchParams), bins: Number(url.searchParams.get('bins') ?? 20), published_only: publishedOnly(user) }));
    if (category === 'compare') {
      const mode = url.searchParams.get('mode') ?? 'year';
      if (mode === 'period') {
        const baseFilters = filters(url.searchParams);
        const aFrom = url.searchParams.get('periodAFrom'); const aTo = url.searchParams.get('periodATo');
        const bFrom = url.searchParams.get('periodBFrom'); const bTo = url.searchParams.get('periodBTo');
        if (!aFrom || !aTo || !bFrom || !bTo) return ok({ mode, unit: null, series: [], note: 'Select both date ranges.' });
        const [a,b] = await Promise.all([
          rpc('wct_hydrology_metrics', { f: { ...baseFilters, dateFrom: aFrom, dateTo: aTo }, kind: 'monthly', granularity: 'month', published_only: publishedOnly(user) }),
          rpc('wct_hydrology_metrics', { f: { ...baseFilters, dateFrom: bFrom, dateTo: bTo }, kind: 'monthly', granularity: 'month', published_only: publishedOnly(user) }),
        ]);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const points = (result: {series:{month:number;mean:number|null}[]}) => monthNames.map((t,i) => ({ t, value: result.series.find((p) => p.month === i+1)?.mean ?? null }));
        return ok({ mode, unit: a.unit ?? b.unit, mixedUnits: a.mixedUnits || b.mixedUnits, series: [ { name: `Period A · ${aFrom} – ${aTo}`, points: points(a) }, { name: `Period B · ${bFrom} – ${bTo}`, points: points(b) } ] });
      }
      return ok(await rpc('wct_hydrology_compare', { f: filters(url.searchParams), mode, series_limit: Number(url.searchParams.get('limit') ?? 6), published_only: publishedOnly(user) }));
    }
    // Record-level views and CSV are deliberately limited to authorized staff.
    if (['export','extremes','scatter'].includes(category) || !category) requireRole(user,'ADMIN','RESEARCHER');
    if (category === 'extremes') return ok(await rpc('wct_hydrology_extremes', { f: filters(url.searchParams), row_limit: Number(url.searchParams.get('limit') ?? 10), threshold: url.searchParams.has('threshold') ? Number(url.searchParams.get('threshold')) : null }));
    if (category === 'scatter') return ok(await rpc('wct_hydrology_scatter', { f: filters(url.searchParams), row_limit: Number(url.searchParams.get('limit') ?? 500) }));
    if (category === 'export') {
      const f = filters(url.searchParams);
      const summary = await rpc('wct_hydrology_metrics', { f, kind: 'summary', granularity: 'month', published_only: false });
      if (summary.totalRecords > 100000) throw new HttpError(413, 'Select a narrower date range before exporting.');
      const columns = ['observedAt','riverId','stationId','dataType','dataSubType','season','value','unit','flag','sourceRowId'];
      const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"','""')}"`;
      const lines = [columns.join(',')];
      for (let offset = 0; offset < summary.totalRecords; offset += 1000) {
        const params = new URLSearchParams({ select: columns.join(','), order: 'observedAt.asc', limit: '1000', offset: String(offset) });
        const rows = await serviceFetch(`/rest/v1/rpc/wct_filtered_records?${params}`, 'POST', { f, published_only: false });
        for (const row of rows) lines.push(columns.map((column) => escape(row[column])).join(','));
      }
      return new Response(lines.join('\n'), { status: 200, headers: { ...cors, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="wct-hydrology.csv"', 'Cache-Control': 'no-store' } });
    }
    if (!category) {
      const f = filters(url.searchParams);
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 25)));
      const sortBy = ['observedAt','value','dataType','season'].includes(url.searchParams.get('sortBy') ?? '') ? url.searchParams.get('sortBy')! : 'observedAt';
      const sortDir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
      const params = new URLSearchParams({ select: 'id,observedAt,value,flag,unit,dataType,dataSubType,season,stationId,riverId,stateId,districtId,parameterId,datasetId', order: `${sortBy}.${sortDir}`, limit: String(pageSize), offset: String((page-1)*pageSize) });
      const [rows,summary,rivers,stations,states,districts,parameters,datasets] = await Promise.all([
        serviceFetch(`/rest/v1/rpc/wct_filtered_records?${params}`, 'POST', { f, published_only: false }),
        rpc('wct_hydrology_metrics', { f, kind: 'summary', granularity: 'month', published_only: false }),
        query('River', { select: 'id,name' }), query('MonitoringStation', { select: 'id,name,code' }), query('State', { select: 'id,name' }),
        query('District', { select: 'id,name' }), query('HydrologyParameter', { select: 'id,name' }), query('Dataset', { select: 'id,name' }),
      ]);
      const byId = (items: {id:string}[], id: string|null) => items.find((item) => item.id === id) as Record<string,unknown> | undefined;
      const data = rows.map((r: Record<string,unknown>) => ({ ...r,
        stationName: byId(stations,r.stationId as string)?.name ?? null, stationCode: byId(stations,r.stationId as string)?.code ?? null,
        riverName: byId(rivers,r.riverId as string)?.name ?? '', stateName: byId(states,r.stateId as string)?.name ?? null,
        districtName: byId(districts,r.districtId as string)?.name ?? null, parameterName: byId(parameters,r.parameterId as string)?.name ?? null,
        datasetName: byId(datasets,r.datasetId as string)?.name ?? null,
      }));
      return new Response(JSON.stringify({ success: true, data, meta: { page, pageSize, total: summary.totalRecords, totalPages: Math.max(1,Math.ceil(summary.totalRecords/pageSize)) } }), { headers: { ...jsonHeaders, ...cors } });
    }
    throw new HttpError(501, `The ${category || 'records'} view is being migrated to Supabase.`, 'NOT_IMPLEMENTED');
  }

  if (parts[0] === 'gis' && method === 'GET') {
    if (parts[1] === 'layers') return ok(await query('GisLayer', { select: 'id,name,kind,description,isPublic,style,sourceUrl', ...(publishedOnly(user) ? { isPublic: 'eq.true' } : {}) }));
    if (parts[1] === 'geojson') return ok(await rpc('wct_geojson', { kind: parts[2], river_id: url.searchParams.get('riverId') }));
    if (parts[1] === 'nearest') return ok([]);
  }

  if (parts[0] === 'datasets' && method === 'GET') {
    const rows = await datasetRows(user, parts[1]);
    if (parts[1] && !rows[0]) throw new HttpError(404, 'Dataset not found.', 'NOT_FOUND');
    return ok(parts[1] ? rows[0] : rows);
  }
  if (parts[0] === 'datasets' && method === 'POST') {
    const actor = requireRole(user,'ADMIN');
    if (parts[1] && ['publish','reject','archive'].includes(parts[2] ?? '')) {
      const desired = parts[2] === 'publish' ? 'PUBLISHED' : parts[2] === 'reject' ? 'REJECTED' : 'ARCHIVED';
      const current = await first('Dataset', { id: `eq.${parts[1]}`, select: 'id,status' });
      if (!current) throw new HttpError(404, 'Dataset not found.', 'NOT_FOUND');
      if (desired === 'PUBLISHED' && current.status !== 'APPROVED') throw new HttpError(409, 'Only approved datasets can be published.');
      return ok(await update('Dataset', parts[1], { status: desired, updatedAt: now() }));
    }
    const input = fields(body ?? {}, ['name','slug','description','dataType','units','methodology','sourceId','riverId','dateFrom','dateTo']);
    if (!input.name || !input.slug) throw new HttpError(400, 'Dataset name and slug are required.');
    return ok(await insert('Dataset', { id: uid(), ...input, status: 'DRAFT', createdById: actor.id, createdAt: now(), updatedAt: now() }), 201);
  }

  if (parts[0] in geoTables && parts[0] !== 'rivers') {
    const config = geoTables[parts[0]];
    if (method === 'GET') {
      const params: Record<string,string> = { select: config.select, order: 'name.asc' };
      if (parts[1]) params.id = `eq.${parts[1]}`;
      for (const key of ['riverId','stateId','districtId']) if (url.searchParams.get(key)) params[key] = `eq.${url.searchParams.get(key)}`;
      const rows = await query(config.table, params);
      return ok(parts[1] ? rows[0] ?? null : rows);
    }
    requireRole(user,'ADMIN');
    if (method === 'POST') return ok(await insert(config.table, { id: uid(), ...fields(body ?? {}, config.fields), ...(config.table === 'MonitoringStation' ? { createdAt: now(), updatedAt: now() } : {}) }), 201);
    if (method === 'PATCH' && parts[1]) return ok(await update(config.table, parts[1], { ...fields(body ?? {}, config.fields), ...(config.table === 'MonitoringStation' ? { updatedAt: now() } : {}) }));
    if (method === 'DELETE' && parts[1]) { await remove(config.table, parts[1]); return new Response(null, { status: 204, headers: cors }); }
  }

  if (parts[0] === 'users') {
    requireRole(user,'ADMIN');
    if (method === 'GET') return ok(await query('User', { select: 'id,email,name,role,active,createdAt', order: 'createdAt.desc' }));
    if (method === 'POST') {
      const input = body as Record<string,string>;
      if (!input.email || !input.password || !input.name) throw new HttpError(400, 'Name, email and password are required.');
      const identity = await serviceFetch('/auth/v1/admin/users', 'POST', { email: input.email.toLowerCase().trim(), password: input.password, email_confirm: true, user_metadata: { name: input.name } });
      const profile = await update('User', identity.id, { role: ['ADMIN','RESEARCHER','VIEWER'].includes(input.role) ? input.role : 'VIEWER', name: input.name, updatedAt: now() });
      return ok(profile, 201);
    }
    if (method === 'PATCH' && parts[1]) {
      const input = body as Record<string,unknown>;
      if (input.password) await serviceFetch(`/auth/v1/admin/users/${parts[1]}`, 'PUT', { password: input.password });
      if (input.role && !['ADMIN','RESEARCHER','VIEWER'].includes(String(input.role))) throw new HttpError(400, 'Invalid role.');
      const changes = fields(input, ['name','role','active']);
      return ok(Object.keys(changes).length ? await update('User', parts[1], { ...changes, updatedAt: now() }) : await first('User', { id: `eq.${parts[1]}`, select: 'id,email,name,role,active,createdAt' }));
    }
    if (method === 'DELETE' && parts[1]) return ok(await update('User', parts[1], { active: false, updatedAt: now() }));
  }

  if (parts[0] === 'reports') {
    const actor = requireRole(user,'ADMIN','RESEARCHER');
    if (method === 'GET') return ok(await query('Report', { select: 'id,name,kind,filters,format,createdAt', createdById: `eq.${actor.id}`, order: 'createdAt.desc' }));
    if (method === 'POST') return ok(await insert('Report', { id: uid(), ...fields(body ?? {}, ['name','kind','filters','format']), createdById: actor.id, createdAt: now() }), 201);
    if (method === 'DELETE' && parts[1]) { await serviceFetch(`/rest/v1/Report?id=eq.${parts[1]}&createdById=eq.${actor.id}`, 'DELETE'); return new Response(null, { status: 204, headers: cors }); }
  }

  if (parts[0] === 'imports') {
    const actor = requireRole(user,'ADMIN','RESEARCHER');
    if (method === 'POST' && parts[1] === 'google-sheets') {
      const sheetUrl = (body as {sheetUrl?:string})?.sheetUrl ?? '';
      const match = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/.exec(sheetUrl);
      if (!match) throw new HttpError(400, 'Enter a Google Sheets URL from docs.google.com.');
      const gid = /(?:[?#&])gid=(\d+)/.exec(sheetUrl)?.[1] ?? '0';
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`);
      if (!response.ok) throw new HttpError(400, 'Could not read the sheet. Share it with anyone who has the link.');
      const csv = await response.text();
      if (csv.length > 2_000_000) throw new HttpError(413, 'Google Sheet is too large. Export it as CSV for upload.');
      const cells = parseCsv(csv);
      if (cells.length < 2 || cells.length > 5001) throw new HttpError(400, 'Google Sheet must contain a header and between 1 and 5,000 data rows.');
      const headers = cells[0].map((cell) => cell.trim());
      if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new HttpError(400, 'Sheet headers must be filled and unique.');
      const importId = uid(); const datasetId = uid(); const timestamp = now();
      await insert('Dataset', { id: datasetId, name: 'Google Sheet (draft)', slug: `import-${importId}`, description: `Google Sheet ${match[1]}; awaiting validation.`, status: 'DRAFT', createdById: actor.id, createdAt: timestamp, updatedAt: timestamp });
      await insert('Import', { id: importId, fileName: 'Google Sheet.csv', originalName: 'Google Sheet.csv', storageKey: `staged:${importId}`, status: 'UPLOADED', datasetId, createdById: actor.id, totalRows: cells.length - 1, summary: { headers, source: 'Google Sheets', sheetId: match[1] }, columnMapping: inferredMapping(headers), createdAt: timestamp, updatedAt: timestamp });
      for (let start = 1; start < cells.length; start += 200) {
        const rows = cells.slice(start, start + 200).map((values, index) => ({ importId, rowNumber: start + index + 1, raw: Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ''])) }));
        await serviceFetch('/rest/v1/ImportStage', 'POST', rows, { Prefer: 'return=minimal' });
      }
      return ok({ importId, headers, mapping: inferredMapping(headers), totalRows: cells.length - 1, note: 'Imported a snapshot of this public Google Sheet. Validate the mapping before submitting.' }, 201);
    }
    if (method === 'GET') {
      const params: Record<string,string> = { select: 'id,fileName,originalName,status,totalRows,validRows,invalidRows,duplicateRows,missingValues,datasetId,createdById,createdAt,updatedAt,summary,columnMapping', order: 'createdAt.desc' };
      if (actor.role !== 'ADMIN') params.createdById = `eq.${actor.id}`;
      if (parts[1]) params.id = `eq.${parts[1]}`;
      const rows = await query('Import', params);
      if (parts[1]) {
        const row = rows[0] ?? null;
        if (!row) throw new HttpError(404, 'Import not found.', 'NOT_FOUND');
        return ok({ ...row, errors: await query('ImportError', { select: 'id,rowNumber,field,code,message,severity', importId: `eq.${parts[1]}`, order: 'rowNumber.asc', limit: '500' }) });
      }
      return ok(rows);
    }
    if (method === 'POST' && !parts[1]) {
      const input = body as {fileName?:string;sizeBytes?:number;headers?:string[];totalRows?:number};
      if (!input?.fileName || !/\.(csv|xlsx)$/i.test(input.fileName) || !Array.isArray(input.headers) || !input.headers.length || !Number.isInteger(input.totalRows) || input.totalRows! < 1)
        throw new HttpError(400, 'Upload a spreadsheet with a header and at least one row.');
      if ((input.sizeBytes ?? 0) > 25*1024*1024 || input.totalRows! > 100000) throw new HttpError(413, 'The import is too large. Limit files to 25 MB and 100,000 rows.');
      const importId = uid(); const datasetId = uid(); const timestamp = now();
      const fileName = input.fileName.slice(0,240);
      await insert('Dataset', { id: datasetId, name: `${fileName.replace(/\.[^.]+$/,'')} (draft)`, slug: `import-${importId}`, description: `Uploaded ${fileName}; awaiting validation.`, status: 'DRAFT', createdById: actor.id, createdAt: timestamp, updatedAt: timestamp });
      await insert('Import', { id: importId, fileName, originalName: fileName, storageKey: `staged:${importId}`, sizeBytes: input.sizeBytes ?? null, status: 'UPLOADED', datasetId, createdById: actor.id, totalRows: input.totalRows, summary: { headers: input.headers }, createdAt: timestamp, updatedAt: timestamp });
      const mapping = inferredMapping(input.headers);
      await update('Import', importId, { columnMapping: mapping });
      return ok({ importId, headers: input.headers, mapping, totalRows: input.totalRows }, 201);
    }
    if (method === 'POST' && parts[1]) {
      const imp = await first('Import', { select: 'id,createdById,status,totalRows,datasetId,fileName', id: `eq.${parts[1]}` });
      if (!imp) throw new HttpError(404, 'Import not found.', 'NOT_FOUND');
      if (actor.role !== 'ADMIN' && imp.createdById !== actor.id) throw new HttpError(403, 'This import belongs to another researcher.', 'FORBIDDEN');
      if (parts[2] === 'rows') {
        if (imp.status !== 'UPLOADED') throw new HttpError(409, 'This import is no longer accepting rows.');
        const rows = (body as {rows?:{rowNumber:number;raw:Record<string,unknown>}[]})?.rows;
        if (!Array.isArray(rows) || rows.length < 1 || rows.length > 250 || rows.some((row) => !Number.isInteger(row.rowNumber) || row.rowNumber < 2 || row.rowNumber > imp.totalRows+1 || !row.raw || typeof row.raw !== 'object')) throw new HttpError(400, 'Invalid import batch.');
        const payload = rows.map((row) => ({ importId: imp.id, rowNumber: row.rowNumber, raw: row.raw }));
        await serviceFetch('/rest/v1/ImportStage?on_conflict=importId,rowNumber', 'POST', payload, { Prefer: 'resolution=merge-duplicates,return=minimal' });
        return ok({ accepted: rows.length });
      }
      if (parts[2] === 'validate') {
        const result = await rpc('wct_validate_import', { import_id: imp.id, mapping: (body as {mapping?:Record<string,string>})?.mapping ?? {} });
        return ok({ importId: imp.id, summary: result });
      }
      if (parts[2] === 'approve') {
        requireRole(actor,'ADMIN');
        const result = await rpc('wct_commit_import', { import_id: imp.id, actor_id: actor.id });
        const submissions = await query('Submission', { select: 'id', importId: `eq.${imp.id}`, status: 'eq.PENDING' });
        for (const submission of submissions) await update('Submission', submission.id, { status: 'APPROVED', reviewedAt: now(), reviewedById: actor.id, updatedAt: now() });
        return ok(result);
      }
      if (parts[2] === 'submit') {
        if (imp.status !== 'VALIDATED') throw new HttpError(409, 'Validate the import before submission.');
        if (await first('Submission', { select: 'id', importId: `eq.${imp.id}`, status: 'eq.PENDING' })) throw new HttpError(409, 'This import is already awaiting review.');
        const submission = await insert('Submission', { id: uid(), userId: actor.id, importId: imp.id, datasetId: imp.datasetId, title: (body as {title?:string})?.title ?? `Import: ${imp.fileName}`, status: 'PENDING', createdAt: now(), updatedAt: now() });
        if (imp.datasetId) await update('Dataset', imp.datasetId, { status: 'SUBMITTED', updatedAt: now() });
        return ok(submission, 201);
      }
    }
  }
  if (parts[0] === 'submissions') {
    const actor = requireRole(user,'ADMIN','RESEARCHER');
    if (method === 'GET') {
      const params: Record<string,string> = { select: 'id,userId,datasetId,importId,title,description,status,reviewNote,reviewedAt,createdAt,updatedAt', order: 'createdAt.desc' };
      if (actor.role !== 'ADMIN') params.userId = `eq.${actor.id}`;
      const [rows, imports] = await Promise.all([query('Submission', params), query('Import', { select: 'id,fileName,totalRows,validRows' })]);
      return ok(rows.map((row: Record<string,unknown>) => ({ ...row, import: imports.find((item: {id:string}) => item.id === row.importId) ?? null })));
    }
    if (method === 'POST' && !parts[1]) {
      const input = fields(body ?? {}, ['title','description','datasetId','importId']);
      if (!input.title) throw new HttpError(400, 'A title is required.');
      return ok(await insert('Submission', { id: uid(), ...input, userId: actor.id, status: 'PENDING', createdAt: now(), updatedAt: now() }), 201);
    }
    if (method === 'POST' && parts[2] === 'review') {
      requireRole(actor,'ADMIN');
      const decision = (body as {decision?:string})?.decision;
      if (decision !== 'APPROVED' && decision !== 'REJECTED') throw new HttpError(400, 'Invalid review decision.');
      const submission = await first('Submission', { id: `eq.${parts[1]}`, select: 'id,status,datasetId,importId' });
      if (!submission) throw new HttpError(404, 'Submission not found.', 'NOT_FOUND');
      if (submission.status !== 'PENDING') throw new HttpError(409, 'Submission has already been reviewed.');
      if (submission.importId && decision === 'APPROVED') await rpc('wct_commit_import', { import_id: submission.importId, actor_id: actor.id });
      const reviewed = await update('Submission', parts[1], { status: decision, reviewNote: (body as {note?:string})?.note ?? null, reviewedAt: now(), reviewedById: actor.id, updatedAt: now() });
      if (submission.datasetId && !(submission.importId && decision === 'APPROVED')) await update('Dataset', submission.datasetId, { status: decision, updatedAt: now() });
      return ok(reviewed);
    }
  }
  if (parts[0] === 'audit-logs' && method === 'GET') {
    requireRole(user,'ADMIN');
    return ok(await query('AuditLog', { select: 'id,action,entityType,entityId,details,userId,createdAt', order: 'createdAt.desc', limit: '200' }));
  }
  if (path === '/admin/stats' && method === 'GET') {
    requireRole(user,'ADMIN');
    const [counts, datasets, activity] = await Promise.all([
      rpc('wct_admin_counts', {}), query('Dataset', { select: 'id,name,status,createdAt,riverId,createdById', order: 'createdAt.desc', limit: '5' }),
      query('AuditLog', { select: 'id,action,entityType,entityId,createdAt', order: 'createdAt.desc', limit: '8' }),
    ]);
    return ok({ counts, recentActivity: activity, latestDatasets: datasets });
  }

  throw new HttpError(404, 'Endpoint not found.', 'NOT_FOUND');
}

Deno.serve(async (req) => { try { return await handle(req); } catch (error) { console.error(error); return failure(error); } });
