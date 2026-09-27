import { useCallback, useEffect, useState } from 'react';
import type { Role, User } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { formatDate } from '@/lib/format';

const ROLES: { value: Role; label: string }[] = [
  { value: 'VIEWER', label: 'Viewer (read-only)' },
  { value: 'RESEARCHER', label: 'Researcher' },
  { value: 'ADMIN', label: 'Administrator' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' as Role });
  const [resetPassword, setResetPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ data: User[] }>('/users')
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/users', form);
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', role: 'VIEWER' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (id: string, role: Role) => {
    try {
      await api.patch(`/users/${id}`, { role });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/users/${id}`, { active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  const doResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetId) return;
    setBusy(true);
    try {
      await api.patch(`/users/${resetId}`, { password: resetPassword });
      setResetId(null);
      setResetPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!users) return <LoadingState label="Loading users…" />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowAdd(true)}>Add user</Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Created</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {users.map((u) => (
            <TR key={u.id}>
              <TD className="font-medium">{u.name}</TD>
              <TD>{u.email}</TD>
              <TD>
                <Select
                  className="h-8 w-44 text-xs"
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value as Role)}
                  options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
                />
              </TD>
              <TD>
                <Badge variant={u.active ? 'success' : 'secondary'}>{u.active ? 'Active' : 'Inactive'}</Badge>
              </TD>
              <TD>{formatDate(u.createdAt ?? '')}</TD>
              <TD className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setResetId(u.id)}>
                    Reset password
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={u.active ? 'text-destructive hover:text-red-800' : 'text-wct-green-700'}
                    onClick={() => toggleActive(u.id, !u.active)}
                  >
                    {u.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add user">
        <form onSubmit={addUser} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Name</Label>
            <Input id="u-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">Password (min 8 characters)</Label>
            <Input id="u-pass" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-role">Role</Label>
            <Select id="u-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} options={ROLES} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </Button>
        </form>
      </Dialog>

      <Dialog open={!!resetId} onClose={() => setResetId(null)} title="Reset password">
        <form onSubmit={doResetPassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-pass">New password (min 8 characters)</Label>
            <Input id="r-pass" type="password" required minLength={8} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
