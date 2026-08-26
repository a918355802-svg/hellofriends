import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a `upi://pay?…` URI as a scannable QR.
 *
 * This exists because the deep links do not reach the payment through. UPI
 * apps refuse a third-party intent that collects into a personal VPA — the
 * request is blocked and reported back as a generic "check limit" error. A QR
 * sidesteps that entirely: nothing is handed to the OS, and the payment is
 * started from inside the payer's own app, where it is an ordinary scan.
 *
 * Rendered as a data URL rather than an <svg> tree so it can be long-pressed
 * and saved like any other image — on a phone the payer screenshots this and
 * feeds it to their app's "scan from gallery".
 */
export function UpiQr({ uri, size = 200 }: { uri: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(uri, {
      width: size * 2, // rendered at 2x so it stays sharp on dense screens
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uri, size]);

  // A blank square would read as "still loading" forever, so a failure says so.
  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-elevated p-4 text-center text-[11px] text-muted ring-1 ring-line"
        style={{ width: size, height: size }}
      >
        QR could not be generated — use the UPI ID below instead.
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-line"
      style={{ width: size, height: size }}
    >
      {src && (
        <img
          src={src}
          alt="UPI QR code"
          width={size - 24}
          height={size - 24}
          className="h-full w-full"
        />
      )}
    </div>
  );
}
