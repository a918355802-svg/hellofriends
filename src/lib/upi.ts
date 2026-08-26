/**
 * UPI links.
 *
 * One thing is built here: the `upi://pay?…` URI behind the QR on the payment
 * sheet. Nothing is handed to the operating system any more.
 *
 * That is the shape of the problem, not a simplification. Deep links —
 * `phonepe://`, `tez://`, `paytmmp://` and plain `upi://` alike — were tried
 * against five payload variations, two payer phones and two bank handles, and
 * were refused every time: an app declines a third-party intent collecting
 * into a personal VPA and reports it back as a generic "check limit", on an
 * amount nowhere near any real limit. A QR carries the identical URI but never
 * touches the OS. The payer scans it inside their own app, where it is an
 * ordinary scan, and it completes. So the QR is the whole path.
 *
 * IMPORTANT: none of this reports an outcome. A UPI app never calls the browser
 * back, so a scanned QR tells us nothing at all. The payer types the reference
 * their app gave them, and the owner confirms the credit in their own bank.
 */

/**
 * Builds the `upi://pay` URI encoded into the QR.
 *
 * The query is assembled by hand rather than with `URLSearchParams`, which
 * would percent-encode the `@` in the VPA. Several UPI apps reject that, so
 * `pa` is written literally and only the free-text fields are encoded.
 *
 * `am` is a two-decimal string on purpose. An app handed a bare `99` can fail
 * to parse it, and some answer that with a bogus "limit exceeded" rather than
 * saying what actually went wrong.
 */
export function buildUpiUri(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  reference: string;
  note: string;
  currency?: string;
}): string {
  const query = [
    `pa=${params.payeeVpa}`,
    `pn=${encodeURIComponent(params.payeeName)}`,
    `tr=${encodeURIComponent(params.reference)}`,
    `tn=${encodeURIComponent(params.note.slice(0, 50))}`,
    `am=${params.amount.toFixed(2)}`,
    `cu=${params.currency ?? 'INR'}`,
  ].join('&');

  return `upi://pay?${query}`;
}

/**
 * A short human-quotable reference, e.g. `HF1A2B3C4DWXYZ`. It identifies the
 * request on screen, in Firestore and to support, and rides in the QR's `tr`.
 *
 * It is not what the owner matches a bank credit against — that is the UPI
 * transaction id the payer copies off their own success screen.
 */
export function makeReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HF${stamp}${random}`;
}

/** A QR is unscannable on the screen showing it; desktop needs saying so. */
export function isLikelyMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}
