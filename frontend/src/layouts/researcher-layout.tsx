import { Outlet } from 'react-router-dom';
import { RequireRole } from '@/components/auth/require-role';
import { PortalShell } from '@/components/portal/portal-shell';

const LINKS = [
  { href: '/researcher', label: 'Dashboard' },
  { href: '/researcher/upload', label: 'Upload data' },
  { href: '/researcher/submissions', label: 'Submissions' },
];

export default function ResearcherLayout() {
  return (
    <RequireRole role="RESEARCHER">
      <PortalShell title="Researcher Portal" subtitle="Upload datasets, review validation results and track submissions." links={LINKS}>
        <Outlet />
      </PortalShell>
    </RequireRole>
  );
}
