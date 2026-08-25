import { useNavigate } from 'react-router-dom';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LazyImage } from '@/components/ui/LazyImage';
import { cn } from '@/lib/cn';
import { PRICING, BRAND } from '@/config/brand';
import { buildAppUpiUri, isLikelyMobile, type UpiApp } from '@/lib/upi';
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
    payWithApp, openUpiAgain, recheck, close, reset,
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
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted">
              Pay {PRICING.currencySymbol}{PRICING.amount} with
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { id: 'phonepe' as UpiApp, label: 'PhonePe', logo: <PhonePeLogo /> },
                  { id: 'gpay' as UpiApp, label: 'GPay', logo: <GPayLogo /> },
                  { id: 'paytm' as UpiApp, label: 'Paytm', logo: <PaytmLogo /> },
                ]
              ).map(({ id, label, logo }) => (
                <button
                  key={id}
                  type="button"
                  disabled={!order}
                  onClick={() => {
                    if (!order) return;
                    payWithApp(buildAppUpiUri({
                      payeeVpa: order.payeeVpa,
                      payeeName: order.payeeName,
                      amount: order.amount,
                      reference: order.reference,
                      note: order.note,
                    }, id));
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-elevated py-4 ring-1 ring-line transition active:scale-95 hover:ring-brand/40 disabled:opacity-50"
                >
                  {logo}
                  <span className="text-[12px] font-bold">{label}</span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-center text-[11px] text-muted">
              100% secure · UPI direct ·{' '}
              <button
                type="button"
                className="font-medium underline underline-offset-2"
                onClick={() => { reset(); navigate('/legal/refunds'); }}
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

function PhonePeLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#5f259f" />
      <path d="M14 11h13c4.97 0 9 4.03 9 9s-4.03 9-9 9h-6v8h-7V11zm7 12h6a3 3 0 000-6h-6v6z" fill="white" />
    </svg>
  );
}

function GPayLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <path d="M35.6 24.6c0-1-.1-2-.3-2.9H24v5.5h6.5c-.3 1.5-1.1 2.7-2.4 3.5v2.9h3.9c2.3-2.1 3.6-5.2 3.6-9z" fill="#4285F4" />
      <path d="M24 37c3.2 0 5.9-1.1 7.9-2.9l-3.9-2.9c-1.1.7-2.5 1.1-4 1.1-3.1 0-5.7-2-6.6-4.8h-4v3C15.4 34.5 19.4 37 24 37z" fill="#34A853" />
      <path d="M17.4 27.5c-.2-.7-.4-1.5-.4-2.5s.1-1.8.4-2.5v-3h-4c-.8 1.7-1.4 3.5-1.4 5.5s.5 3.8 1.4 5.5l4-3z" fill="#FBBC04" />
      <path d="M24 17.2c1.8 0 3.4.6 4.6 1.8l3.4-3.4C30 13.7 27.2 12.5 24 12.5c-4.6 0-8.6 2.5-10.6 6.5l4 3c.9-2.8 3.5-4.8 6.6-4.8z" fill="#EA4335" />
    </svg>
  );
}

function PaytmLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00BAF2" />
      <path d="M13 12h13c4.4 0 8 3.6 8 8s-3.6 8-8 8h-5v8h-8V12zm8 10h5a2 2 0 000-4h-5v4z" fill="white" />
    </svg>
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
