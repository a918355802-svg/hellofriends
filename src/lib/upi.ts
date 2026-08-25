/**
 * UPI deep links.
 *
 * There is exactly one way out of this app and into a payment app: the plain
 * `upi://pay?…` URI. Android and iOS both treat that as "someone wants to make
 * a UPI payment" and show the device's own list of whatever UPI apps are
 * installed — PhonePe, Paytm, Google Pay, WhatsApp, the bank's own app,
 * anything. One installed app opens straight away; several, and the phone puts
 * up its own picker.
 *
 * This app deliberately shows no app picker of its own. A browser is not
 * allowed to ask the operating system which apps exist, so any list drawn in
 * HTML would be a guess — and naming a package that is not installed dead-ends
 * on an error page. Handing the URI to the OS cannot pick the wrong app,
 * because the OS is the only party that actually knows.
 *
 * The flip side, and it cannot be worked around from a web page: the contents
 * of that picker belong to the phone. If WhatsApp is registered as a UPI
 * handler it will be listed, and no parameter in the URI can hide it.
 *
 * IMPORTANT: none of this reports an outcome. A UPI app never calls the browser
 * back, so opening one tells us only that the user left. Settlement is
 * confirmed by the owner in the admin dashboard.
 */

/**
 * Builds a `upi://pay` URI.
 *
 * The query is assembled by hand rather than with `URLSearchParams`, which
 * would percent-encode the `@` in the VPA. Several UPI apps reject that, so
 * `pa` is written literally and only the free-text fields are encoded.
 */
export function buildUpiUri(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  reference: string;
  note: string;
  currency?: string;
}): string {
  const fields = [
    `pa=${params.payeeVpa}`,
    `pn=${encodeURIComponent(params.payeeName)}`,
    `am=${params.amount.toFixed(2)}`,
    `cu=${params.currency ?? 'INR'}`,
    `tr=${params.reference}`,
    `tn=${encodeURIComponent(params.note.slice(0, 50))}`,
  ];
  return `upi://pay?${fields.join('&')}`;
}

/**
 * A short human-quotable reference, e.g. `HF1A2B3C4DWXYZ`. It travels in the
 * UPI note, so the owner can match a credit in their bank statement back to a
 * row in the dashboard.
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
