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
 * Two rules shape it.
 *
 * 1. Nothing here decides that a payment succeeded. The payer scans a QR in
 *    their own app, which tells the browser nothing, and the id they type
 *    afterwards is their claim, not proof. `success` arrives only when the
 *    owner confirms the credit, over a Firestore listener.
 *
 * 2. Nothing blocks the payer. The Firestore record is written in the
 *    background when the sheet opens, so a weak connection cannot stall the
 *    QR — and if that write fails the payer still sees a reference to quote.
 *
 * There is no handoff to a UPI app any more. Deep links are refused for a
 * personal VPA — see `src/lib/upi.ts` — so the sheet shows a QR and the payee
 * details, and the payer pays from inside their own app.
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
  /**
   * Records the payment the payer says they just made, with the UPI
   * transaction id from their app's success screen.
   */
  payManually: (transactionId: string) => void;
  /** Back to the sheet after a rejected payment, on a fresh request. */
  retry: () => void;
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
   * Moves the request to `pending` and starts watching for the owner's verdict.
   *
   * `transactionId` is what the payer read off their UPI app's success screen.
   * It is the only thread tying a row here to a line in the owner's bank
   * statement, so it travels with the status change rather than after it.
   */
  const record = useCallback(
    (draft: PaymentDraft, transactionId: string) => {
      setPhase('awaiting');
      markPaymentAttempted(draft.paymentId, transactionId);
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

  const payManually = useCallback(
    (transactionId: string) => {
      if (!target) return;

      // A record the owner has already ruled on is closed for good: the rules
      // let a payer move a request out of `initiated`/`pending` and nowhere
      // else. So paying again after a verdict has to open a fresh request.
      const reusable =
        phase === 'sheet' || phase === 'awaiting' || phase === 'pending' ? order : null;

      const draft = reusable ?? prepare(target.partner, target.interactionType);
      if (!draft) {
        setErrorMessage('Your session is still starting. Please try again in a moment.');
        setPhase('failed');
        return;
      }

      setErrorMessage(null);
      record(draft, transactionId);
    },
    [target, order, phase, prepare, record],
  );

  const retry = useCallback(() => {
    if (!target) return;
    stopWatching();
    setErrorMessage(null);
    setOrder(null);
    setRecorded(false);
    setPhase('sheet');
    prepare(target.partner, target.interactionType);
  }, [target, stopWatching, prepare]);

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
      payManually,
      retry,
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
      payManually,
      retry,
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

