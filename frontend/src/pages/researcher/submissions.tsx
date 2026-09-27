import { useCallback, useEffect, useState } from 'react';
import type { SubmissionRow } from '@/types';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDateTime, formatNumber } from '@/lib/format';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ data: SubmissionRow[] }>('/submissions')
      .then((r) => setSubmissions(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load submissions.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!submissions) return <LoadingState label="Loading submissions…" />;

  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground">No submissions yet. Validate an import and submit it for review from the Upload page.</p>;
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Title</TH>
          <TH>Status</TH>
          <TH>Import</TH>
          <TH>Rows (valid)</TH>
          <TH>Submitted</TH>
          <TH>Reviewed</TH>
          <TH>Review note</TH>
        </TR>
      </THead>
      <TBody>
        {submissions.map((s) => (
          <TR key={s.id}>
            <TD className="max-w-[220px] truncate font-medium">{s.title}</TD>
            <TD>
              <Badge variant={s.status === 'APPROVED' ? 'success' : s.status === 'REJECTED' ? 'destructive' : 'warning'}>{s.status}</Badge>
            </TD>
            <TD className="max-w-[180px] truncate text-xs text-muted-foreground">{s.import?.fileName ?? '—'}</TD>
            <TD>{s.import?.validRows != null ? `${formatNumber(s.import.validRows, 0)} / ${formatNumber(s.import.totalRows ?? 0, 0)}` : '—'}</TD>
            <TD>{formatDateTime(s.createdAt)}</TD>
            <TD>{s.reviewedAt ? formatDateTime(s.reviewedAt) : '—'}</TD>
            <TD className="max-w-[220px] truncate text-xs text-muted-foreground">{s.reviewNote ?? '—'}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
