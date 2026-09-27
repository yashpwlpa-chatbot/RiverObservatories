import { useCallback, useEffect, useState } from 'react';
import type { AuditLogRow } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDateTime } from '@/lib/format';

interface Meta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const q = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (entityType) q.set('entityType', entityType);
    if (action) q.set('action', action);
    api
      .get<{ data: AuditLogRow[]; meta: Meta }>(`/audit-logs?${q.toString()}`)
      .then((r) => {
        setLogs(r.data);
        setMeta(r.meta);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit logs.'));
  }, [page, entityType, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input className="w-48" placeholder="Filter by action…" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        <Input className="w-48" placeholder="Filter by entity type…" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} />
        {(action || entityType) ? (
          <Button variant="ghost" size="sm" onClick={() => { setAction(''); setEntityType(''); setPage(1); }}>
            Clear
          </Button>
        ) : null}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !logs ? (
        <LoadingState label="Loading audit logs…" />
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit entries match the filters.</p>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>User</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Entity ID</TH>
                <TH>IP</TH>
              </TR>
            </THead>
            <TBody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap">{formatDateTime(l.createdAt)}</TD>
                  <TD>{l.user?.name ?? l.user?.email ?? '—'}</TD>
                  <TD className="font-medium">{l.action}</TD>
                  <TD>{l.entityType}</TD>
                  <TD className="max-w-[160px] truncate text-xs text-muted-foreground">{l.entityId ?? '—'}</TD>
                  <TD className="text-xs text-muted-foreground">{l.ipAddress ?? '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {meta ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {meta.total.toLocaleString('en-IN')} entries · page {meta.page} of {meta.totalPages || 1}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
