import { Outlet } from 'react-router-dom';
import { RequireRole } from '@/components/auth/require-role';
import { PortalShell } from '@/components/portal/portal-shell';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/import', label: 'Import data' },
  { href: '/admin/datasets', label: 'Datasets' },
  { href: '/admin/rivers', label: 'Rivers & geography' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Audit logs' },
];

export default function AdminLayout() {
  return (
    <RequireRole role="ADMIN">
      <PortalShell title="Admin Portal" subtitle="Manage rivers, datasets, users and data imports." links={LINKS}>
        <Outlet />
      </PortalShell>
    </RequireRole>
  );
}
