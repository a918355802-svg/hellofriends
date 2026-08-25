import type { PaymentStatus } from '@/types';

const STYLES: Record<PaymentStatus, { label: string; className: string }> = {
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  initiated: { label: 'Initiated', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700 ring-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const style = STYLES[status] ?? STYLES.initiated;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${style.className}`}
    >
      {style.label}
    </span>
  );
}
