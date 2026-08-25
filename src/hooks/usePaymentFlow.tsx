import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildAppUpiUri, openUpiUri, type UpiApp } from '@/lib/upi';
import {
  cancelPayment,
  createPaymentDraft,
  fetchPaymentStatus,
  markPaymentAttempted,
  subscribeToPaymentStatus,
} from '@/services/payments.service';
import type { InteractionType, Partner, PaymentDraft } from '@/types';
import { useGuestSession } from './useGuestSession';

/**
 * Payment flow — direct UPI, no backend.
 *
 *   idle → sheet → awaiting → success
 *                          ↘ pending | cancelled
 *
 * Three rules shape it.
 *
 * 1. Nothing here decides that a payment succeeded. A UPI app tells the browser
 *    nothing, so leaving for one only means the user left. `success` arrives
 *    only when the owner confirms the credit, over a Firestore listener.
 *
 * 2. The handoff must happen inside the user's tap. Browsers refuse to open a
 *    custom scheme once the gesture is gone, so the UPI link is built the
 *    moment the sheet opens and the redirect is synchronous.
 *
 * 3. Nothing blocks the redirect. A UPI link needs only the payee and the
 *    amount, both already in the bundle, so the Firestore record is written
 *    alongside it — and if that write fails the user still reaches their UPI
 *    app with a reference to quote.
 *
 * The sheet's three buttons each hand the phone that app's own scheme —
 * `phonepe://`, `tez://`, `paytmmp://` — so tapping PhonePe opens PhonePe. The
 * retry affordance falls back to the plain `upi://pay?…` link, which lets the
 * operating system show its own picker of everything actually installed.
 *
 * The record is created when the sheet opens, not when Pay is tapped, so it has
 * a few seconds of a live tab to reach the server. The `initiated → pending`
 * update does race the redirect, which is why returning to the tab re-checks:
 * Firestore flushes whatever it queued while the UPI app was in front.
 */

export type PaymentPhase =
  | 'idle'
  | 'sheet'
  | 'creating'
  | 'awaiting'
  | 'verifying'
  | 'success'
  | 'pending'
  | 'failed'
  | 'cancelled';

interface PaymentTarget {
  partner: Partner;
  interactionType: InteractionType;
}

interface PaymentFlowValue {
  phase: PaymentPhase;
  target: PaymentTarget | null;
  order: PaymentDraft | null;
  errorMessage: string | null;
  /** False when the request could not be recorded — the UPI link still works. */
  recorded: boolean;
  /** Opens the ₹99 sheet. Called by every Call / Chat / Video button. */
  open: (partner: Partner, interactionType: InteractionType) => void;
  /** Hands off to the user's UPI apps with ₹99 pre-filled. */
  pay: () => void;
  /** Opens a specific UPI app (PhonePe / GPay / Paytm) with ₹99 pre-filled. */
  payWithApp: (app: UpiApp) => void;
  /** Re-opens the phone's UPI picker for the same payment. */
  openUpiAgain: () => void;
  /** Manual "I have paid" re-check. */
  recheck: () => void;
  close: () => void;
  reset: () => void;
}

const PaymentFlowContext = createContext<PaymentFlowValue | null>(null);

export function PaymentFlowProvider({ children }: { children: ReactNode }) {
  const { uid } = useGuestSession();

  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  const [order, setOrder] = useState<PaymentDraft | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  const unsubscribeStatus = useRef<(() => void) | null>(null);
  const mounted = useRef(true);

  // Read by the visibility listener, which is registered once and must not go
  // stale between renders.
  const orderRef = useRef<PaymentDraft | null>(null);
  const phaseRef = useRef<PaymentPhase>('idle');
  orderRef.current = order;
  phaseRef.current = phase;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const stopWatching = useCallback(() => {
    unsubscribeStatus.current?.();
    unsubscribeStatus.current = null;
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const applyStatus = useCallback(
    (status: string, failureReason?: string | null) => {
      if (!mounted.current) return;
      if (status === 'verified') {
        stopWatching();
        setPhase('success');
      } else if (status === 'failed') {
        stopWatching();
        setErrorMessage(failureReason ?? 'This payment could not be confirmed.');
        setPhase('failed');
      }
    },
    [stopWatching],
  );

  /** Watches the record so the owner's confirmation lands on screen live. */
  const watchPayment = useCallback(
    (paymentId: string) => {
      stopWatching();
      if (!paymentId) return;
      unsubscribeStatus.current = subscribeToPaymentStatus(
        paymentId,
        (status) => applyStatus(status),
        () => undefined,
      );
    },
    [applyStatus, stopWatching],
  );

  /**
   * Hands the phone off to a UPI app.
   *
   * `app` names one of the three buttons on the sheet and produces that app's
   * own scheme; without it the plain `upi://` link goes out and the OS shows
   * its own picker (the retry affordance).
   *
   * The redirect is the very first statement on purpose. A browser only honours
   * a navigation to a custom scheme while the tap that triggered it is still
   * live, so no Firestore write and no state update may run ahead of it.
   */
  const launch = useCallback(
    (draft: PaymentDraft, app?: UpiApp) => {
      openUpiUri(
        app
          ? buildAppUpiUri(
              {
                payeeVpa: draft.payeeVpa,
                payeeName: draft.payeeName,
                amount: draft.amount,
                reference: draft.reference,
                note: draft.note,
              },
              app,
            )
          : draft.upiUri,
      );

      setPhase('awaiting');
      markPaymentAttempted(draft.paymentId);
      watchPayment(draft.paymentId);
    },
    [watchPayment],
  );

  /**
   * Builds the link and records the intent. Returns the draft immediately —
   * the Firestore write syncs in the background, so a weak connection can never
   * stall the redirect.
   */
  const prepare = useCallback(
    (partner: Partner, interactionType: InteractionType): PaymentDraft | null => {
      if (!uid) return null;

      const { draft, saved } = createPaymentDraft({ uid, partner, interactionType });
      setOrder(draft);
      setRecorded(true);

      saved.catch(() => {
        if (mounted.current) setRecorded(false);
      });

      return draft;
    },
    [uid],
  );

  const open = useCallback(
    (partner: Partner, interactionType: InteractionType) => {
      stopWatching();
      setErrorMessage(null);
      setOrder(null);
      setRecorded(false);
      setTarget({ partner, interactionType });
      setPhase('sheet');
      prepare(partner, interactionType);
    },
    [stopWatching, prepare],
  );

  const reset = useCallback(() => {
    stopWatching();
    setPhase('idle');
    setTarget(null);
    setOrder(null);
    setErrorMessage(null);
    setRecorded(false);
  }, [stopWatching]);

  const close = useCallback(() => {
    // Backing out before leaving for a UPI app cancels the record, so the
    // dashboard is not full of phantom rows. Never done afterwards: money may
    // already have moved, and only the owner decides that.
    if (order?.paymentId && (phase === 'sheet' || phase === 'creating')) {
      cancelPayment(order.paymentId);
    }
    reset();
  }, [order, phase, reset]);

  /**
   * Shared entry point behind every pay button.
   *
   * Everything here is synchronous, so the redirect inside `launch` stays
   * within the user's tap — the only way a browser will open a custom scheme.
   */
  const start = useCallback(
    (app?: UpiApp) => {
      if (!target) return;

      // A record the owner has already ruled on is closed for good: the rules
      // let a payer move a request out of `initiated`/`pending` and nowhere
      // else. So retrying after a verdict has to open a fresh request, or the
      // very first write would be rejected and the sheet would snap to failed.
      const reusable =
        phase === 'sheet' || phase === 'awaiting' || phase === 'pending' ? order : null;

      // The sheet prepares a draft as it opens, but the session may still have
      // been starting then. Preparing again here keeps the buttons live rather
      // than leaving them dead on a tap that produced nothing.
      const draft = reusable ?? prepare(target.partner, target.interactionType);
      if (!draft) {
        setErrorMessage('Your session is still starting. Please try again in a moment.');
        setPhase('failed');
        return;
      }

      setErrorMessage(null);
      launch(draft, app);
    },
    [target, order, phase, launch, prepare],
  );

  const pay = useCallback(() => start(), [start]);

  const payWithApp = useCallback((app: UpiApp) => start(app), [start]);

  const openUpiAgain = useCallback(() => {
    if (!order) return;
    launch(order);
  }, [order, launch]);

  const recheck = useCallback(() => {
    const paymentId = order?.paymentId;
    if (!paymentId) return;
    setPhase('verifying');
    (async () => {
      try {
        const status = await fetchPaymentStatus(paymentId);
        if (!mounted.current) return;
        if (status === 'verified' || status === 'failed') {
          applyStatus(status);
        } else {
          setPhase('pending');
          watchPayment(paymentId);
        }
      } catch {
        if (mounted.current) setPhase('pending');
      }
    })();
  }, [order, applyStatus, watchPayment]);

  /**
   * Re-checks the moment the user comes back from their UPI app.
   *
   * Leaving for a UPI app backgrounds the tab, and Firestore parks any write it
   * had in flight — including the `initiated → pending` update fired just
   * before the redirect. Coming back is the first chance to flush that queue,
   * so this re-reads the record then: the sheet catches up, and the admin's
   * dashboard stops showing a payment that is stuck at `initiated`.
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const paymentId = orderRef.current?.paymentId;
      if (!paymentId || phaseRef.current !== 'awaiting') return;

      markPaymentAttempted(paymentId);
      fetchPaymentStatus(paymentId)
        .then((status) => {
          if (status === 'verified' || status === 'failed') applyStatus(status);
        })
        .catch(() => undefined);
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [applyStatus]);

  const value = useMemo<PaymentFlowValue>(
    () => ({
      phase,
      target,
      order,
      errorMessage,
      recorded,
      open,
      pay,
      payWithApp,
      openUpiAgain,
      recheck,
      close,
      reset,
    }),
    [
      phase,
      target,
      order,
      errorMessage,
      recorded,
      open,
      pay,
      payWithApp,
      openUpiAgain,
      recheck,
      close,
      reset,
    ],
  );

  return <PaymentFlowContext.Provider value={value}>{children}</PaymentFlowContext.Provider>;
}

export function usePaymentFlow(): PaymentFlowValue {
  const context = useContext(PaymentFlowContext);
  if (!context) throw new Error('usePaymentFlow must be used inside <PaymentFlowProvider>');
  return context;
}

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  call: 'Voice call',
  chat: 'Chat',
  video: 'Video call',
};

