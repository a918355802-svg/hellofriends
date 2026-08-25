import { Spinner } from '@/components/ui/Spinner';

export function AdminLoading({ label = 'Loading dashboard…' }: { label?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner size={28} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-slate-200">
          {Array.from({ length: cols }, (_, colIndex) => (
            <td key={colIndex} className="px-4 py-3.5">
              <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
