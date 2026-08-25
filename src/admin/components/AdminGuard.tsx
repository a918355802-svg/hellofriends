import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoading } from './AdminLoading';

/**
 * Route guard for the dashboard.
 *
 * This is UX, not security. The actual protection is the admin email check in
 * `firestore.rules` and the payment API: a visitor who bypasses this component
 * reaches a dashboard whose every query is rejected by the server.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, status } = useAdminAuth();
  const location = useLocation();

  if (status === 'loading') return <AdminLoading label="Checking your access…" />;

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
