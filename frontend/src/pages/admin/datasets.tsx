import { useCallback, useEffect, useState } from 'react';
import type { DatasetSummary } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ data: DatasetSummary[] }>('/datasets')
      .then((r) => setDatasets(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load datasets.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const view = async (id: string) => {
    try {
      const r = await api.get<{ data: Record<string, unknown> }>(`/datasets/${id}`);
      setDetail(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dataset.');
    }
  };

  const archive = async (id: string) => {
    if (!window.confirm('Archive this dataset? It will be hidden from the public portal.')) return;
    try {
      await api.post(`/datasets/${id}/archive`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive dataset.');
    }
  };

  const publish = async (id: string) => {
    try {
      await api.post(`/datasets/${id}/publish`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish dataset.');
    }
  };

  const reject = async (id: string) => {
    if (!window.confirm('Reject this dataset? Its data will remain hidden from viewers.')) return;
    try {
      await api.post(`/datasets/${id}/reject`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject dataset.');
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!datasets) return <LoadingState label="Loading datasets…" />;

  return (
    <div>
      {datasets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No datasets yet. Import a dataset to get started.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>River</TH>
              <TH>Type</TH>
              <TH>Records</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {datasets.map((d) => (
              <TR key={d.id}>
                <TD className="max-w-[260px]">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Source: {d.source?.name ?? '—'}</p>
                </TD>
                <TD>{d.river?.name ?? '—'}</TD>
                <TD>{d.dataType ?? 'Mixed'}</TD>
                <TD>{formatNumber(d.recordCount, 0)}</TD>
                <TD>
                  <Badge variant={STATUS_VARIANT[d.status] ?? 'secondary'}>{d.status}</Badge>
                </TD>
                <TD>{formatDate(d.createdAt)}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    {['DRAFT', 'VALIDATED', 'SUBMITTED', 'APPROVED'].includes(d.status) ? (
                      <Button variant="outline" size="sm" onClick={() => publish(d.id)}>
                        Publish
                      </Button>
                    ) : null}
                    {d.status === 'PUBLISHED' ? (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-red-800" onClick={() => archive(d.id)}>
                        Archive
                      </Button>
                    ) : null}
                    {['SUBMITTED', 'VALIDATED', 'DRAFT'].includes(d.status) ? (
                      <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900" onClick={() => reject(d.id)}>
                        Reject
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => view(d.id)}>
                      Metadata
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} title="Dataset metadata">
        {detail ? (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Meta label="Name" value={String(detail.name ?? '—')} />
            <Meta label="Status" value={String(detail.status ?? '—')} />
            <Meta label="Source" value={String((detail.source as { name?: string } | null)?.name ?? '—')} />
            <Meta label="River" value={String((detail.river as { name?: string } | null)?.name ?? '—')} />
            <Meta label="Data types" value={Array.isArray(detail.dataTypes) ? detail.dataTypes.join(', ') : '—'} />
            <Meta label="Units" value={String(detail.units ?? '—')} />
            <Meta label="Record count" value={formatNumber(Number(detail.recordCount ?? 0), 0)} />
            <Meta label="Computed range" value={`${formatDate(detail.computedDateFrom as string)} → ${formatDate(detail.computedDateTo as string)}`} />
            <Meta label="Created" value={formatDateTime(detail.createdAt as string)} />
            <Meta label="Updated" value={formatDateTime(detail.updatedAt as string)} />
            <div className="sm:col-span-2">
              <dt className="font-medium">Methodology</dt>
              <dd className="mt-1 text-muted-foreground">{String(detail.methodology ?? '—')}</dd>
            </div>
          </dl>
        ) : null}
      </Dialog>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd className="mt-0.5 text-muted-foreground">{value}</dd>
    </div>
  );
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary',
  VALIDATED: 'outline',
  SUBMITTED: 'warning',
  APPROVED: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
  REJECTED: 'destructive',
};
