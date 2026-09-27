import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/ui/state';

type TabKey = 'rivers' | 'states' | 'districts' | 'stretches' | 'stations';

interface RiverRow { id: string; name: string; slug: string; stationCount: number; stretchCount: number; recordCount: number }
interface StateRow { id: string; name: string; code: string | null }
interface DistrictRow { id: string; name: string; state: { id: string; name: string } }
interface StretchRow { id: string; name: string; river: { id: string; name: string }; state: { id: string; name: string } | null }
interface StationRow { id: string; name: string; code: string | null; river: { id: string; name: string }; state: { id: string; name: string } | null; latitude: number | null; longitude: number | null }

export default function ManageGeographyPage() {
  const [tab, setTab] = useState<TabKey>('rivers');
  const [rivers, setRivers] = useState<RiverRow[] | null>(null);
  const [states, setStates] = useState<StateRow[] | null>(null);
  const [districts, setDistricts] = useState<DistrictRow[] | null>(null);
  const [stretches, setStretches] = useState<StretchRow[] | null>(null);
  const [stations, setStations] = useState<StationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | { kind: TabKey; edit?: Record<string, unknown> }>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, s, d, st, sta] = await Promise.all([
        api.get<{ data: RiverRow[] }>('/rivers'),
        api.get<{ data: StateRow[] }>('/states'),
        api.get<{ data: DistrictRow[] }>('/districts'),
        api.get<{ data: StretchRow[] }>('/river-stretches'),
        api.get<{ data: StationRow[] }>('/stations'),
      ]);
      setRivers(r.data);
      setStates(s.data);
      setDistricts(d.data);
      setStretches(st.data);
      setStations(sta.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (kind: TabKey, id: string) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      const path = kind === 'rivers' ? 'rivers' : kind === 'states' ? 'states' : kind === 'districts' ? 'districts' : kind === 'stretches' ? 'river-stretches' : 'stations';
      await api.del(`/${path}/${id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Tabs
        items={[
          { value: 'rivers', label: 'Rivers' },
          { value: 'states', label: 'States' },
          { value: 'districts', label: 'Districts' },
          { value: 'stretches', label: 'River stretches' },
          { value: 'stations', label: 'Monitoring stations' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
      />

      <div className="flex justify-end">
        <Button onClick={() => setDialog({ kind: tab })}>Add {tab === 'stretches' ? 'stretch' : tab === 'stations' ? 'station' : tab.slice(0, -1)}</Button>
      </div>

      {tab === 'rivers' && (
        <EntityTable
          loading={!rivers}
          head={['Name', 'Slug', 'Stations', 'Stretches', 'Records', '']}
          rows={(rivers ?? []).map((r) => [
            r.name, r.slug, String(r.stationCount), String(r.stretchCount), String(r.recordCount),
          ])}
          actions={(rivers ?? []).map((r) => ({ id: r.id, row: r as unknown as Record<string, unknown> }))}
          onEdit={(row) => setDialog({ kind: 'rivers', edit: row })}
          onDelete={(id) => remove('rivers', id)}
        />
      )}

      {tab === 'states' && (
        <EntityTable
          loading={!states}
          head={['Name', 'Code', '']}
          rows={(states ?? []).map((s) => [s.name, s.code ?? '—'])}
          actions={(states ?? []).map((s) => ({ id: s.id, row: s as unknown as Record<string, unknown> }))}
          onDelete={(id) => remove('states', id)}
        />
      )}

      {tab === 'districts' && (
        <EntityTable
          loading={!districts}
          head={['Name', 'State', '']}
          rows={(districts ?? []).map((d) => [d.name, d.state.name])}
          actions={(districts ?? []).map((d) => ({ id: d.id, row: d as unknown as Record<string, unknown> }))}
          onDelete={(id) => remove('districts', id)}
        />
      )}

      {tab === 'stretches' && (
        <EntityTable
          loading={!stretches}
          head={['Name', 'River', 'State', '']}
          rows={(stretches ?? []).map((s) => [s.name, s.river.name, s.state?.name ?? '—'])}
          actions={(stretches ?? []).map((s) => ({ id: s.id, row: s as unknown as Record<string, unknown> }))}
          onDelete={(id) => remove('stretches', id)}
        />
      )}

      {tab === 'stations' && (
        <EntityTable
          loading={!stations}
          head={['Name', 'Code', 'River', 'State', 'Lat, Lng', '']}
          rows={(stations ?? []).map((s) => [s.name, s.code ?? '—', s.river.name, s.state?.name ?? '—', `${s.latitude?.toFixed(3) ?? '—'}, ${s.longitude?.toFixed(3) ?? '—'}`])}
          actions={(stations ?? []).map((s) => ({ id: s.id, row: s as unknown as Record<string, unknown> }))}
          onEdit={(row) => setDialog({ kind: 'stations', edit: row })}
          onDelete={(id) => remove('stations', id)}
        />
      )}

      <ManageDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          load();
        }}
        rivers={rivers ?? []}
        states={states ?? []}
        districts={districts ?? []}
        stretches={stretches ?? []}
      />
    </div>
  );
}

function EntityTable({
  loading,
  head,
  rows,
  actions,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  head: string[];
  rows: string[][];
  actions: { id: string; row: Record<string, unknown> }[];
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) return <LoadingState label="Loading…" />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No records yet. Use “Add” to create one.</p>;
  return (
    <Table>
      <THead>
        <TR>
          {head.map((h, i) => (
            <TH key={i}>{h}</TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((cells, i) => (
          <TR key={actions[i]?.id ?? i}>
            {cells.map((c, j) => (
              <TD key={j} className={j === 0 ? 'font-medium' : ''}>
                {c}
              </TD>
            ))}
            <TD className="text-right">
              <div className="flex justify-end gap-2">
                {onEdit ? (
                  <Button variant="outline" size="sm" onClick={() => onEdit(actions[i].row)}>
                    Edit
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="text-destructive hover:text-red-800" onClick={() => onDelete(actions[i].id)}>
                  Delete
                </Button>
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function ManageDialog({
  dialog,
  onClose,
  onSaved,
  rivers,
  states,
  districts,
  stretches,
}: {
  dialog: { kind: TabKey; edit?: Record<string, unknown> } | null;
  onClose: () => void;
  onSaved: () => void;
  rivers: RiverRow[];
  states: StateRow[];
  districts: DistrictRow[];
  stretches: StretchRow[];
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (dialog) {
      const prefill: Record<string, string> = {};
      if (dialog.edit) {
        for (const [k, v] of Object.entries(dialog.edit)) {
          if (v != null) prefill[k] = typeof v === 'object' ? (v as { id: string }).id ?? '' : String(v);
        }
      }
      setForm(prefill);
      setErr(null);
    }
  }, [dialog]);

  if (!dialog) return null;
  const kind = dialog.kind;
  const isEdit = !!dialog.edit;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const path =
      kind === 'rivers' ? 'rivers' : kind === 'states' ? 'states' : kind === 'districts' ? 'districts' : kind === 'stretches' ? 'river-stretches' : 'stations';
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === '' || v === undefined) continue;
      if (['lengthKm', 'basinAreaKm2', 'latitude', 'longitude', 'elevationM', 'fromKm', 'toKm'].includes(k)) body[k] = Number(v);
      else body[k] = v;
    }
    try {
      if (isEdit && dialog.edit) await api.patch(`/${path}/${dialog.edit.id}`, body);
      else await api.post(`/${path}`, body);
      onSaved();
    } catch (err2) {
      setErr(err2 instanceof Error ? err2.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const title = `${isEdit ? 'Edit' : 'Add'} ${kind === 'stretches' ? 'stretch' : kind.slice(0, -1)}`;

  return (
    <Dialog open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-3">
        {kind === 'rivers' && (
          <>
            <F label="Name *"><Input required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></F>
            <F label="Slug (optional, e.g. ganga)"><Input value={form.slug ?? ''} onChange={(e) => set('slug', e.target.value)} /></F>
            <F label="Description"><Input value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></F>
            <F label="Origin"><Input value={form.origin ?? ''} onChange={(e) => set('origin', e.target.value)} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Length (km)"><Input type="number" step="any" value={form.lengthKm ?? ''} onChange={(e) => set('lengthKm', e.target.value)} /></F>
              <F label="Basin area (km²)"><Input type="number" step="any" value={form.basinAreaKm2 ?? ''} onChange={(e) => set('basinAreaKm2', e.target.value)} /></F>
            </div>
          </>
        )}
        {kind === 'states' && (
          <>
            <F label="Name *"><Input required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></F>
            <F label="Code"><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></F>
          </>
        )}
        {kind === 'districts' && (
          <>
            <F label="Name *"><Input required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></F>
            <F label="State *">
              <Select required value={form.stateId ?? ''} onChange={(e) => set('stateId', e.target.value)} placeholder="Select state" options={states.map((s) => ({ value: s.id, label: s.name }))} />
            </F>
          </>
        )}
        {kind === 'stretches' && (
          <>
            <F label="Name *"><Input required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></F>
            <F label="River *">
              <Select required value={form.riverId ?? ''} onChange={(e) => set('riverId', e.target.value)} placeholder="Select river" options={rivers.map((r) => ({ value: r.id, label: r.name }))} />
            </F>
            <F label="State">
              <Select value={form.stateId ?? ''} onChange={(e) => set('stateId', e.target.value)} placeholder="Optional" options={states.map((s) => ({ value: s.id, label: s.name }))} />
            </F>
            <F label="Description"><Input value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></F>
          </>
        )}
        {kind === 'stations' && (
          <>
            <F label="Name *"><Input required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></F>
            <F label="Code"><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></F>
            <F label="River *">
              <Select required value={form.riverId ?? ''} onChange={(e) => set('riverId', e.target.value)} placeholder="Select river" options={rivers.map((r) => ({ value: r.id, label: r.name }))} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="State">
                <Select value={form.stateId ?? ''} onChange={(e) => set('stateId', e.target.value)} placeholder="Optional" options={states.map((s) => ({ value: s.id, label: s.name }))} />
              </F>
              <F label="District">
                <Select value={form.districtId ?? ''} onChange={(e) => set('districtId', e.target.value)} placeholder="Optional" options={districts.map((d) => ({ value: d.id, label: d.name }))} />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Latitude"><Input type="number" step="any" value={form.latitude ?? ''} onChange={(e) => set('latitude', e.target.value)} /></F>
              <F label="Longitude"><Input type="number" step="any" value={form.longitude ?? ''} onChange={(e) => set('longitude', e.target.value)} /></F>
            </div>
            <F label="Elevation (m)"><Input type="number" step="any" value={form.elevationM ?? ''} onChange={(e) => set('elevationM', e.target.value)} /></F>
          </>
        )}
        {err ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </Button>
      </form>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
