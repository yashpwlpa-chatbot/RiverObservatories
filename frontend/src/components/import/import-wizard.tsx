
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImportRow, ValidationSummary } from '@/types';
import { api } from '@/lib/api';
import { parseImportFile } from '@/lib/spreadsheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDateTime, formatNumber } from '@/lib/format';

const FIELDS: { key: string; label: string }[] = [
  { key: 'river', label: 'River *' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'station', label: 'Station' },
  { key: 'dataType', label: 'Data type' },
  { key: 'dataSubType', label: 'Data sub-type' },
  { key: 'season', label: 'Season' },
  { key: 'date', label: 'Date *' },
  { key: 'value', label: 'Value *' },
  { key: 'parameter', label: 'Parameter' },
  { key: 'unit', label: 'Unit' },
  { key: 'flag', label: 'Flag / quality' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
];

interface ActiveImport {
  id: string;
  fileName: string;
  headers: string[];
  mapping: Record<string, string>;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  UPLOADED: 'secondary',
  PARSED: 'secondary',
  VALIDATING: 'warning',
  VALIDATED: 'warning',
  IMPORTING: 'warning',
  IMPORTED: 'success',
  PARTIAL: 'warning',
  REJECTED: 'destructive',
  FAILED: 'destructive',
};

export function ImportWizard({ mode }: { mode: 'admin' | 'researcher' }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<ActiveImport | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [imports, setImports] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const loadImports = useCallback(() => {
    setListError(null);
    api
      .get<{ data: ImportRow[] }>('/imports')
      .then((r) => setImports(r.data))
      .catch((e) => setListError(e instanceof Error ? e.message : 'Failed to load imports.'));
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  const startImport = (resp: { importId: string; headers: string[]; mapping: Record<string, string> | null; fileName?: string }) => {
    setActive({ id: resp.importId, fileName: resp.fileName ?? 'file', headers: resp.headers, mapping: resp.mapping ?? {} });
    setMapping(resp.mapping ?? {});
    setSummary(null);
    setError(null);
    setDone(null);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = await parseImportFile(file);
      const resp = await api.post<{ data: { importId: string; headers: string[]; mapping: Record<string, string> | null } }>('/imports', {
        fileName: file.name, sizeBytes: file.size, headers: parsed.headers, totalRows: parsed.rows.length,
      });
      const chunkSize = 250;
      for (let start = 0; start < parsed.rows.length; start += chunkSize) {
        const rows = parsed.rows.slice(start, start + chunkSize).map((raw, index) => ({ rowNumber: start + index + 2, raw }));
        await api.post(`/imports/${resp.data.importId}/rows`, { rows });
        setDone(`Preparing ${Math.min(start + chunkSize, parsed.rows.length).toLocaleString()} of ${parsed.rows.length.toLocaleString()} rows…`);
      }
      setDone(null);
      startImport({ ...resp.data, fileName: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSheets = async () => {
    if (!sheetUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await api.post<{ data: { importId: string; headers: string[]; mapping: Record<string, string> | null; note?: string } }>(
        '/imports/google-sheets',
        { sheetUrl },
      );
      startImport({ importId: resp.data.importId, headers: resp.data.headers, mapping: resp.data.mapping ?? {}, fileName: `Google Sheet` });
      setDone(resp.data.note ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sheets import failed.');
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await api.post<{ data: { summary: ValidationSummary } }>(`/imports/${active.id}/validate`, { mapping });
      setSummary(resp.data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await api.post<{ data: { inserted: number; skippedDuplicate: number; skippedInvalid: number; missingCount: number; datasetId: string; datasetStatus?: string } }>(
        `/imports/${active.id}/approve`,
      );
      setDone(
        `Imported: ${formatNumber(resp.data.inserted, 0)} records inserted, ${formatNumber(resp.data.skippedDuplicate, 0)} duplicates skipped, ${formatNumber(resp.data.skippedInvalid, 0)} invalid skipped. Dataset is ${resp.data.datasetStatus ?? 'APPROVED'} — publish it from the Datasets page to make it visible to viewers.`,
      );
      setActive(null);
      setSummary(null);
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/imports/${active.id}/submit`, { title: `Import: ${active.fileName}` });
      setDone('Submitted for admin review.');
      setActive(null);
      setSummary(null);
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload a dataset</CardTitle>
          <CardDescription>Excel (.xlsx) or CSV. Rows are validated before anything reaches production tables.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" id="import-file" onChange={onFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              Choose file…
            </Button>
            <span className="text-sm text-muted-foreground">.xlsx or .csv</span>
          </div>

          <div className="border-t border-border pt-4">
            <Label htmlFor="sheet-url">Or import from a public Google Sheet (pull-based — not real-time)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="sheet-url" placeholder="https://docs.google.com/spreadsheets/d/…" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
              <Button variant="secondary" onClick={onSheets} disabled={busy || !sheetUrl.trim()}>
                Import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {done ? (
        <div className="rounded-md border border-wct-green-200 bg-wct-green-50 px-3 py-2 text-sm text-wct-green-700">{done}</div>
      ) : null}

      {/* Column mapping */}
      {active && !summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Map columns</CardTitle>
            <CardDescription>
              File: <span className="font-medium">{active.fileName}</span>. Map each field to a column in your file. Fields marked * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  <Select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    placeholder="Not mapped"
                    options={active.headers.map((h) => ({ value: h, label: h }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button onClick={validate} disabled={busy || !mapping.river || !mapping.date}>
                {busy ? 'Validating…' : 'Validate data'}
              </Button>
              <Button variant="ghost" onClick={() => { setActive(null); setSummary(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Validation results */}
      {active && summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Validation results</CardTitle>
            <CardDescription>Invalid records are never silently discarded — review them below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Total rows" value={formatNumber(summary.totalRows, 0)} />
              <Stat label="Valid" value={formatNumber(summary.validRows, 0)} tone="good" />
              <Stat label="Invalid" value={formatNumber(summary.invalidRows, 0)} tone={summary.invalidRows > 0 ? 'bad' : undefined} />
              <Stat label="Duplicates" value={formatNumber(summary.duplicateRows, 0)} tone={summary.duplicateRows > 0 ? 'warn' : undefined} />
              <Stat label="Missing values" value={formatNumber(summary.missingValues, 0)} />
            </div>

            {summary.fieldErrors.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold">Errors by field</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.fieldErrors.map((fe) => (
                    <Badge key={fe.field} variant="destructive">
                      {fe.field}: {fe.count}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {summary.errorCodes && summary.errorCodes.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold">Error codes</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.errorCodes.map((ec) => (
                    <Badge key={ec.code} variant="outline">
                      {ec.code}: {ec.count}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {summary.errorSamples.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold">Sample errors (first {summary.errorSamples.length})</h4>
                <Table>
                  <THead>
                    <TR>
                      <TH>Row</TH>
                      <TH>Field</TH>
                      <TH>Code</TH>
                      <TH>Message</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {summary.errorSamples.slice(0, 20).map((e, i) => (
                      <TR key={i}>
                        <TD>{e.rowNumber}</TD>
                        <TD>{e.field ?? '—'}</TD>
                        <TD>
                          <Badge variant="destructive">{e.code}</Badge>
                        </TD>
                        <TD>{e.message}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : null}

            <div className="flex items-center gap-3 border-t border-border pt-4">
              {mode === 'admin' ? (
                <Button onClick={approve} disabled={busy || summary.validRows === 0}>
                  {busy ? 'Importing…' : 'Approve & import valid rows'}
                </Button>
              ) : (
                <Button onClick={submit} disabled={busy || summary.validRows === 0}>
                  {busy ? 'Submitting…' : 'Submit for admin review'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSummary(null)}>
                Back to mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent imports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
        </CardHeader>
        <CardContent>
          {listError ? (
            <ErrorState message={listError} onRetry={loadImports} />
          ) : !imports ? (
            <LoadingState label="Loading imports…" />
          ) : imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>File</TH>
                  <TH>Status</TH>
                  <TH>Valid / Invalid / Dup</TH>
                  <TH>Uploaded</TH>
                  <TH>By</TH>
                </TR>
              </THead>
              <TBody>
                {imports.slice(0, 20).map((imp) => (
                  <TR key={imp.id}>
                    <TD className="max-w-[220px] truncate font-medium">{imp.fileName}</TD>
                    <TD>
                      <Badge variant={STATUS_VARIANT[imp.status] ?? 'secondary'}>{imp.status}</Badge>
                    </TD>
                    <TD>
                      {formatNumber(imp.validRows, 0)} / {formatNumber(imp.invalidRows, 0)} / {formatNumber(imp.duplicateRows, 0)}
                    </TD>
                    <TD>{formatDateTime(imp.createdAt)}</TD>
                    <TD>{imp.createdBy?.name ?? '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  const color = tone === 'good' ? 'text-wct-green-700' : tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : 'text-foreground';
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
