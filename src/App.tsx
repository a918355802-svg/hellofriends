import { Suspense, lazy } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SetupNotice } from '@/components/SetupNotice';
import { RouteFallback } from '@/components/RouteFallback';
import { GuestSessionProvider } from '@/hooks/useGuestSession';
import { PaymentFlowProvider } from '@/hooks/usePaymentFlow';
import { ToastProvider } from '@/hooks/useToast';
import { AdminAuthProvider } from '@/hooks/useAdminAuth';
// Imported from `env` rather than `config/firebase` so a misconfigured deploy
// renders the setup notice without downloading the Firebase SDK at all.
import { isFirebaseConfigured } from '@/config/env';

/**
 * Route-level code splitting: the admin dashboard and its dependencies never
 * reach a normal visitor's device.
 */
const HomePage = lazy(() => import('@/pages/HomePage'));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const ChatsPage = lazy(() => import('@/pages/ChatsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const PartnerDetailPage = lazy(() => import('@/pages/PartnerDetailPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const AdminApp = lazy(() => import('@/admin/AdminApp'));

/**
 * Guest session and payment state are scoped to the public routes only.
 * Mounting them globally would sign an admin in anonymously just for opening
 * `/admin`, creating a junk guest account on every visit to the dashboard.
 */
function PublicProviders() {
  return (
    <GuestSessionProvider>
      <PaymentFlowProvider>
        <Outlet />
      </PaymentFlowProvider>
    </GuestSessionProvider>
  );
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupNotice />;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Admin dashboard — separate shell, separate auth context */}
              <Route
                path="/admin/*"
                element={
                  <AdminAuthProvider>
                    <AdminApp />
                  </AdminAuthProvider>
                }
              />

              {/* Public mobile app */}
              <Route element={<PublicProviders />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:id" element={<PartnerDetailPage />} />
                  <Route path="/legal/:slug" element={<LegalPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
