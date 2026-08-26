/**
 * UPI deep links.
 *
 * Two ways out of this app and into a payment app:
 *
 *   1. A plain `upi://pay?…` URI. Android and iOS both treat that as "someone
 *      wants to make a UPI payment" and show the device's own list of whatever
 *      UPI apps are installed. Used for the generic retry affordance.
 *
 *   2. An app-specific scheme — `phonepe://`, `tez://`, `paytmmp://` — used by
 *      the three buttons on the sheet, so tapping PhonePe opens PhonePe and
 *      not whatever handler the OS happened to rank first.
 *
 * IMPORTANT: none of this reports an outcome. A UPI app never calls the browser
 * back, so opening one tells us only that the user left. Settlement is
 * confirmed by the owner in the admin dashboard.
 */

/**
 * Assembles the shared UPI query string.
 *
 * The full set, in the order the spec lists them: payee, payee name, a unique
 * transaction reference, a note, the amount, the currency.
 *
 * Two of these are load-bearing in a way that is easy to get wrong, and both
 * of them surface as a *"limit exceeded"* rather than as a parse error, on
 * amounts nowhere near any real limit:
 *
 *   - `am` must be a two-decimal string. An app handed a bare `99` can fail to
 *     parse it, and some fall back to a maximum-threshold exception instead of
 *     reporting the real problem.
 *   - `tr` must be present and unique per attempt. Dropping it, or replaying
 *     the same one, trips the same fallback.
 *
 * `mc` is deliberately absent: it declares a merchant category, and this pays
 * a personal VPA. Claiming a merchant code the account does not have invites a
 * rejection of its own.
 *
 * Built by hand rather than with `URLSearchParams`, which would percent-encode
 * the `@` in the VPA. Several UPI apps reject that outright, so `pa` is written
 * literally and every free-text field is encoded.
 */
function upiQuery(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  reference: string;
  note: string;
  currency?: string;
}): string {
  return [
    `pa=${params.payeeVpa}`,
    `pn=${encodeURIComponent(params.payeeName)}`,
    `tr=${encodeURIComponent(params.reference)}`,
    `tn=${encodeURIComponent(params.note.slice(0, 50))}`,
    `am=${params.amount.toFixed(2)}`,
    `cu=${params.currency ?? 'INR'}`,
  ].join('&');
}

/** Builds a `upi://pay` URI — the one the OS picker resolves. */
export function buildUpiUri(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  reference: string;
  note: string;
  currency?: string;
}): string {
  return `upi://pay?${upiQuery(params)}`;
}

/**
 * A short human-quotable reference, e.g. `HF1A2B3C4DWXYZ`. It identifies the
 * request on screen, in Firestore and to support, and it is the stem of the
 * `tr` sent to the UPI app — see `attemptReference`, which makes each attempt
 * its own.
 */
export function makeReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HF${stamp}${random}`;
}

/**
 * A `tr` for one attempt at paying one request.
 *
 * UPI wants the transaction reference to be unique per attempt: replaying the
 * one from a previous try is among the things that come back as a bogus "limit
 * exceeded". Suffixing the request's own reference keeps both properties — the
 * value is new every time, and it still starts with the reference the owner
 * sees in the dashboard, so a bank narration can be traced back to a row.
 */
export function attemptReference(reference: string, attempt: number): string {
  return `${reference}${String(attempt).padStart(2, '0')}`;
}

/** UPI links only resolve on a phone; desktop users have to pay manually. */
export function isLikelyMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export type UpiApp = 'phonepe' | 'gpay' | 'paytm';

/**
 * Builds an app-specific UPI deep link using each app's own URL scheme.
 *
 * phonepe://  works on both Android and iOS for PhonePe.
 * tez://      works on both Android and iOS for Google Pay.
 * paytmmp://  works on both Android and iOS for Paytm.
 *
 * Do NOT use intent:// — it redirects to the Play Store when the app is absent,
 * which throws away the open sheet along with the reference on it. A custom
 * scheme that nothing handles simply does nothing, and the sheet survives.
 *
 * Do NOT use generic upi:// here — the OS picks whatever handler registered
 * last (often WhatsApp), not the app the user actually tapped.
 */
export function buildAppUpiUri(
  params: {
    payeeVpa: string;
    payeeName: string;
    amount: number;
    reference: string;
    note: string;
  },
  app: UpiApp,
): string {
  const query = upiQuery(params);

  switch (app) {
    case 'phonepe': return `phonepe://pay?${query}`;
    case 'gpay':    return `tez://upi/pay?${query}`;
    case 'paytm':   return `paytmmp://pay?${query}`;
  }
}

/**
 * Hands a UPI URI to the operating system.
 *
 * Must be called synchronously from inside the tap that asked for it: browsers
 * only honour a navigation to a custom scheme while the user gesture is still
 * live. Anything awaited beforehand — a Firestore write, a state flush — and
 * the redirect is silently dropped.
 *
 * A no-op off mobile, where no UPI app exists to receive it.
 */
export function openUpiUri(uri: string): void {
  if (!isLikelyMobile()) return;
  window.location.href = uri;
}
