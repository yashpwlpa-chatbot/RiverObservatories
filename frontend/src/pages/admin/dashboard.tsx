import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDateTime } from '@/lib/format';

interface AdminStats {
  counts: {
    rivers: number;
    stations: number;
    datasets: number;
    records: number;
    pendingSubmissions: number;
    failedImports: number;
    users: number;
  };
  recentActivity: { id: string; action: string; entityType: string; entityId: string | null; createdAt: string; user?: { name: string } | null }[];
  latestDatasets: { id: string; name: string; status: string; createdAt: string; river?: { name: string } | null; createdBy?: { name: string } | null }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setStats(null);
    api
      .get<{ data: AdminStats }>('/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <LoadingState label="Loading dashboard…" />;

  const c = stats.counts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rivers" value={c.rivers} />
        <StatCard label="Stations" value={c.stations} />
        <StatCard label="Datasets" value={c.datasets} />
        <StatCard label="Records" value={c.records.toLocaleString('en-IN')} />
        <StatCard label="Pending submissions" value={c.pendingSubmissions} hint={c.pendingSubmissions > 0 ? 'Awaiting review' : undefined} />
        <StatCard label="Failed imports" value={c.failedImports} />
        <StatCard label="Users" value={c.users} />
        <StatCard label="Quick actions" value="—" />
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin/import">Import dataset</ButtonLink>
        <ButtonLink href="/admin/rivers" variant="outline">Manage rivers</ButtonLink>
        <ButtonLink href="/admin/users" variant="outline">Manage users</ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">
                      <span className="font-medium">{a.action}</span>
                      <span className="text-muted-foreground"> · {a.entityType}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest datasets</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.latestDatasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No datasets yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.latestDatasets.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link to="/admin/datasets" className="truncate hover:underline">
                      {d.name}
                    </Link>
                    <Badge variant={d.status === 'ACTIVE' ? 'success' : 'secondary'}>{d.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
