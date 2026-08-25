import { useNavigate } from 'react-router-dom';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LazyImage } from '@/components/ui/LazyImage';
import { cn } from '@/lib/cn';
import { PRICING, BRAND } from '@/config/brand';
import { isLikelyMobile } from '@/lib/upi';
import { INTERACTION_LABELS, usePaymentFlow } from '@/hooks/usePaymentFlow';
import type { InteractionType } from '@/types';

const ACTION_ICON: Record<InteractionType, IconName> = {
  call: 'phone',
  chat: 'chat',
  video: 'video',
};

const ASSURANCES: { icon: IconName; tone: string; text: string }[] = [
  {
    icon: 'check-circle',
    tone: 'bg-online/12 text-online',
    text: 'Payment verified within minutes',
  },
  {
    icon: 'lock',
    tone: 'bg-brand/12 text-brand',
    text: 'Pay inside your own UPI app — PIN stays private',
  },
];

/**
 * The single global payment surface. Rendered once in `AppShell`, driven
 * entirely by `usePaymentFlow`, so any Call/Chat/Video button anywhere in the
 * app opens it without prop-drilling.
 *
 * Payment is a direct UPI transfer to the owner's VPA with ₹99 pre-filled. The
 * copy never claims a payment succeeded before the owner has confirmed it —
 * that is not something the browser can know.
 */
export function PaymentSheet() {
  const {
    phase, target, order, errorMessage, recorded,
    pay, openUpiAgain, recheck, close, reset,
  } = usePaymentFlow();
  const navigate = useNavigate();

  if (phase === 'idle' || !target) return null;

  const { partner, interactionType } = target;
  const interactionLabel = INTERACTION_LABELS[interactionType];
  const busy = phase === 'creating' || phase === 'verifying';

  return (
    <Sheet open onClose={close} dismissible={!busy} showClose={!busy}>
      {/* ---------------------------------------------------------- offer */}
      {phase === 'sheet' && (
        <div className="pb-2 pt-1">
          {/* Who this is for. Compact — the price below is the real content. */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <LazyImage
                src={partner.photoUrl}
                alt={partner.name}
                fallbackName={partner.name}
                className="h-14 w-14 rounded-2xl ring-2 ring-brand/20"
              />
              {partner.online && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface">
                  <span className="h-2.5 w-2.5 rounded-full bg-online" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-extrabold leading-tight">
                {partner.name}
                {partner.age ? `, ${partner.age}` : ''}
              </h2>
              {/* Status only — what is being bought is stated on the price
                  card below, so repeating it here just doubles the words. */}
              <p
                className={cn(
                  'mt-0.5 text-[12.5px] font-medium',
                  partner.online ? 'font-semibold text-online' : 'text-muted',
                )}
              >
                {partner.online ? 'Online now' : 'Currently offline'}
              </p>
            </div>
          </div>

          {/* The price. One row, so the number is the only thing being said. */}
          <div className="relative mt-4 flex items-center justify-between gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-accent px-5 py-3.5 text-white shadow-card ring-1 ring-inset ring-white/20">
            <span
              className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-white/25 blur-2xl"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />

            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
                Only pay
              </p>
              <p className="mt-0.5 flex items-baseline gap-0.5 font-extrabold leading-none">
                <span className="text-[21px]">{PRICING.currencySymbol}</span>
                <span className="text-[40px] tracking-tighter">{PRICING.amount}</span>
              </p>
            </div>

            <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
              <Icon name={ACTION_ICON[interactionType]} size={12} />
              {interactionLabel}
            </span>
          </div>

          {/* Two short promises. Short is what makes them read as promises. */}
          <ul className="mt-4 space-y-2.5">
            {ASSURANCES.map((item) => (
              <li key={item.text} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full',
                    item.tone,
                  )}
                >
                  <Icon name={item.icon} size={13} />
                </span>
                <span className="text-[13px] font-medium leading-snug text-ink">{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Button
              size="lg"
              fullWidth
              onClick={pay}
              className="h-14 min-h-[56px] bg-gradient-to-r from-brand to-accent text-[17px] tracking-tight shadow-pop"
              leadingIcon={<Icon name="heart" size={19} />}
            >
              Pay {PRICING.currencySymbol}
              {PRICING.amount} &amp; Connect
            </Button>

            <p className="mt-2.5 text-center text-[11px] text-muted">
              Opens your UPI app · 100% secure ·{' '}
              <button
                type="button"
                className="font-medium underline underline-offset-2"
                onClick={() => {
                  reset();
                  navigate('/legal/refunds');
                }}
              >
                Refund policy
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------- creating/verifying */}
      {(phase === 'creating' || phase === 'awaiting' || phase === 'verifying') && (
        <>
          <StatusPanel
            spinner
            title={
              phase === 'creating'
                ? 'Opening your UPI app…'
                : phase === 'verifying'
                  ? 'Checking your payment…'
                  : 'Waiting for your payment…'
            }
            description={
              phase === 'awaiting'
                ? `Complete the ${PRICING.currencySymbol}${PRICING.amount} payment in your UPI app, then come back here.`
                : 'This only takes a moment. Please do not close this screen.'
            }
          />

          {phase === 'awaiting' && order && (
            <div className="pb-3">
              <dl className="space-y-1.5 rounded-2xl bg-elevated p-3.5 text-sm ring-1 ring-line">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Amount</dt>
                  <dd className="font-bold text-brand">
                    {PRICING.currencySymbol}
                    {PRICING.amount}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Reference</dt>
                  <dd className="font-mono text-xs">{order.reference}</dd>
                </div>
              </dl>

              {errorMessage && (
                <p className="mt-3 rounded-2xl bg-warning/10 p-3 text-center text-xs font-medium text-warning">
                  {errorMessage}
                </p>
              )}

              {/* No app list here on purpose: the phone shows its own, listing
                  what is really installed. See src/lib/upi.ts. */}
              {isLikelyMobile() && (
                <button
                  type="button"
                  onClick={openUpiAgain}
                  className="mt-3 w-full rounded-2xl bg-elevated p-3 text-center text-[13px] font-semibold ring-1 ring-line transition active:scale-[0.98]"
                >
                  UPI app did not open? Tap to open it again
                </button>
              )}

              {!isLikelyMobile() && (
                <div className="mt-3 flex gap-2 rounded-2xl bg-warning/10 p-3 text-xs text-warning">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                  UPI apps only open on a phone. On a computer, pay {PRICING.currencySymbol}
                  {PRICING.amount} to the UPI ID above and quote the reference.
                </div>
              )}

              {!recorded && (
                <div className="mt-3 flex gap-2 rounded-2xl bg-warning/10 p-3 text-xs text-warning">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                  Save this reference. We could not record the request automatically, so quote it
                  if you need to contact support.
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                {recorded && (
                  <Button
                    size="lg"
                    fullWidth
                    onClick={recheck}
                    leadingIcon={<Icon name="refresh" size={17} />}
                  >
                    I have paid — check now
                  </Button>
                )}
                <Button size="lg" variant="ghost" fullWidth onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* -------------------------------------------------------- success */}
      {phase === 'success' && (
        <div className="pb-3 pt-1 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-online/12 text-online">
            <Icon name="check-circle" size={34} />
          </div>
          <h2 className="mt-4 text-xl font-bold">
            Payment Successful <span aria-hidden="true">🎉</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            Your {PRICING.currencySymbol}
            {PRICING.amount} payment has been verified.
          </p>
          {order?.reference && (
            <p className="mt-1 text-xs text-muted">
              Reference <span className="font-mono">{order.reference}</span>
            </p>
          )}
          <div className="mt-6">
            <Button size="lg" fullWidth onClick={close}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- pending */}
      {phase === 'pending' && (
        <div className="pb-3 pt-1 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/12 text-warning">
            <Icon name="clock" size={32} />
          </div>
          <h2 className="mt-4 text-xl font-bold">Payment pending</h2>
          <p className="mt-2 text-sm text-muted">
            If the money has left your account, it will be confirmed shortly — UPI payments are
            checked and confirmed by our team. You can close this and come back later.
          </p>
          {order?.reference && (
            <p className="mt-2 text-xs text-muted">
              Keep this reference: <span className="font-mono font-semibold">{order.reference}</span>
            </p>
          )}
          {errorMessage && <p className="mt-2 text-xs text-muted">{errorMessage}</p>}
          <div className="mt-6 space-y-2.5">
            <Button
              size="lg"
              fullWidth
              onClick={recheck}
              leadingIcon={<Icon name="refresh" size={17} />}
            >
              Check again
            </Button>
            <Button size="lg" variant="ghost" fullWidth onClick={close}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------- failed/cancelled */}
      {(phase === 'failed' || phase === 'cancelled') && (
        <div className="pb-3 pt-1 text-center">
          <div
            className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
              phase === 'failed' ? 'bg-danger/12 text-danger' : 'bg-muted/12 text-muted',
            )}
          >
            <Icon name={phase === 'failed' ? 'alert' : 'x'} size={30} />
          </div>
          <h2 className="mt-4 text-xl font-bold">
            {phase === 'failed' ? 'Payment failed' : 'Payment cancelled'}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {phase === 'failed'
              ? (errorMessage ?? 'This payment was not received. Please retry.')
              : 'No problem — you can try again whenever you like.'}
          </p>
          {phase === 'failed' && (
            <>
              {order?.reference && (
                <p className="mt-2 text-xs text-muted">
                  Reference <span className="font-mono font-semibold">{order.reference}</span>
                </p>
              )}
              <p className="mt-2 text-xs text-muted">
                If money did leave your account, email {BRAND.supportEmail} with this reference and
                we will sort it out.
              </p>
            </>
          )}
          <div className="mt-6 space-y-2.5">
            <Button size="lg" fullWidth onClick={pay}>
              Retry payment
            </Button>
            <Button size="lg" variant="ghost" fullWidth onClick={close}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function StatusPanel({
  title,
  description,
  spinner = false,
}: {
  title: string;
  description: string;
  spinner?: boolean;
}) {
  return (
    <div className="px-2 py-10 text-center">
      {spinner && (
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Spinner size={28} />
        </div>
      )}
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted">{description}</p>
    </div>
  );
}
