import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminGuard } from './components/AdminGuard';
import { AdminLoading } from './components/AdminLoading';

const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const PartnerFormPage = lazy(() => import('./pages/PartnerFormPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

/**
 * The admin dashboard is a separate application shell — desktop-first SaaS
 * layout, its own auth context, and none of the public app's mobile chrome.
 */
export default function AdminApp() {
  return (
    <div className="admin-shell">
      <Suspense fallback={<AdminLoading />}>
        <Routes>
          <Route path="login" element={<AdminLoginPage />} />

          <Route
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="partners/new" element={<PartnerFormPage mode="create" />} />
            <Route path="partners/:id/edit" element={<PartnerFormPage mode="edit" />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
