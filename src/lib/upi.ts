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
 * Deliberately minimal: the payee, their name, and the amount. Nothing else.
 *
 * This is an ordinary person-to-person transfer into a personal VPA, so the
 * intent is written the way one looks — the same four fields a personal UPI QR
 * carries. The extras all work against that. `tr` is a *merchant* transaction
 * reference, and sending it makes the app try to validate the intent against a
 * merchant code and signature a personal VPA does not have; PhonePe answers
 * that by refusing the payment outright. A `tn` note on top of it only makes
 * the request look more like a collection and less like a transfer.
 *
 * Built by hand rather than with `URLSearchParams`, which would percent-encode
 * the `@` in the VPA. Several UPI apps reject that, so `pa` is written
 * literally and only the free-text name is encoded.
 *
 * The trade-off is real and is not a bug: the payment reaches the owner's bank
 * carrying no reference, so a credit cannot be matched to a dashboard row by
 * anything except its amount and the time it arrived. Every payment here is
 * the same ₹99, so two payers a minute apart are indistinguishable in the bank
 * statement. The reference still exists on screen and in Firestore for support
 * to quote; it simply no longer travels with the money.
 */
function upiQuery(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  currency?: string;
}): string {
  return [
    `pa=${params.payeeVpa}`,
    `pn=${encodeURIComponent(params.payeeName)}`,
    `am=${params.amount.toFixed(2)}`,
    `cu=${params.currency ?? 'INR'}`,
  ].join('&');
}

/** Builds a `upi://pay` URI — the one the OS picker resolves. */
export function buildUpiUri(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  currency?: string;
}): string {
  return `upi://pay?${upiQuery(params)}`;
}

/**
 * A short human-quotable reference, e.g. `HF1A2B3C4DWXYZ`. It identifies the
 * request on screen, in Firestore and to support. It is deliberately NOT put
 * into the UPI intent — see `upiQuery` — so it never reaches the bank
 * statement.
 */
export function makeReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HF${stamp}${random}`;
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
