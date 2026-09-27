import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DatasetSummary, ImportRow, SubmissionRow } from '@/types';
import { api } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

export default function ResearcherDashboard() {
  const [imports, setImports] = useState<ImportRow[] | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null);
  const [datasets, setDatasets] = useState<DatasetSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api.get<{ data: ImportRow[] }>('/imports'),
      api.get<{ data: SubmissionRow[] }>('/submissions'),
      api.get<{ data: DatasetSummary[] }>('/datasets'),
    ])
      .then(([i, s, d]) => {
        setImports(i.data);
        setSubmissions(s.data);
        setDatasets(d.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!imports || !submissions || !datasets) return <LoadingState label="Loading dashboard…" />;

  const pending = submissions.filter((s) => s.status === 'PENDING').length;
  const imported = imports.filter((i) => i.status === 'IMPORTED' || i.status === 'PARTIAL').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="My imports" value={imports.length} />
        <StatCard label="Imported" value={imported} />
        <StatCard label="Pending submissions" value={pending} />
        <StatCard label="Available datasets" value={datasets.length} />
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/researcher/upload">Upload dataset</ButtonLink>
        <ButtonLink href="/researcher/submissions" variant="outline">
          View submissions
        </ButtonLink>
        <ButtonLink href="/visualize" variant="outline">
          Create visualization
        </ButtonLink>
        <ButtonLink href="/gis" variant="outline">
          GIS explorer
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent imports</CardTitle>
          </CardHeader>
          <CardContent>
            {imports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports yet.</p>
            ) : (
              <ul className="space-y-2">
                {imports.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{i.fileName}</span>
                    <Badge variant={i.status === 'IMPORTED' ? 'success' : i.status === 'PARTIAL' ? 'warning' : 'secondary'}>{i.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="space-y-2">
                {submissions.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{s.title}</span>
                    <Badge variant={s.status === 'APPROVED' ? 'success' : s.status === 'REJECTED' ? 'destructive' : 'warning'}>{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved data &amp; downloads</CardTitle>
        </CardHeader>
        <CardContent>
          {datasets.filter((d) => d.status === 'PUBLISHED').length === 0 ? (
            <p className="text-sm text-muted-foreground">No published datasets available.</p>
          ) : (
            <ul className="divide-y divide-border">
              {datasets.filter((d) => d.status === 'PUBLISHED').map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.river?.name ?? 'All rivers'} · {formatNumber(d.recordCount, 0)} records · updated {formatDate(d.updatedAt)}
                    </p>
                  </div>
                  {d.river ? (
                    <Link to={`/rivers/${d.river.slug ?? d.river.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/hydrology`} className="text-sm font-medium text-primary hover:underline">
                      Open dashboard →
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
