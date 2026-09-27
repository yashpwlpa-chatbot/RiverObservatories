
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/types';
import { LoadingState } from '@/components/ui/state';

/**
 * Client-side route guard. The API enforces authorization independently —
 * this only controls the UX (redirect to /login or the public portal).
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`, { replace: true });
    } else if (!hasRole(role)) {
      navigate('/rivers', { replace: true });
    }
  }, [loading, user, hasRole, role, navigate]);

  if (loading) return <LoadingState label="Checking access…" className="py-24" />;
  if (!user || !hasRole(role)) return <LoadingState label="Redirecting…" className="py-24" />;
  return <>{children}</>;
}
