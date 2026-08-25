import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { PaymentSheet } from '@/components/payment/PaymentSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGuestSession } from '@/hooks/useGuestSession';
import { BRAND } from '@/config/brand';

/**
 * The public app frame: a phone-width column that stays centred on desktop, a
 * fixed tab bar, and the single global payment sheet.
 */
export function AppShell() {
  const { status, error, retry } = useGuestSession();

  // Without a session there is nothing to show and nothing to retry from inside
  // a page, so the shell handles it once instead of every screen guessing.
  if (status === 'error') {
    return (
      <div className="app-shell flex min-h-[100dvh] items-center justify-center">
        <EmptyState
          icon="wifi-off"
          title="We could not start your session"
          description={
            error ??
            `${BRAND.name} could not connect. Please check your internet connection and try again.`
          }
          actionLabel="Try again"
          onAction={retry}
        />
      </div>
    );
  }

  return (
    <div className="app-shell relative pb-nav">
      <Outlet />
      <BottomNav />
      <PaymentSheet />
    </div>
  );
}
