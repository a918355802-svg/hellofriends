import { useEffect, useState } from 'react';
import { subscribeToUsers } from '@/services/users.service';
import { formatDateTime, formatRelative } from '@/lib/format';
import { adminError } from '@/lib/errors';
import { TableSkeleton } from '../components/AdminLoading';
import type { AppUser } from '@/types';

const PAGE_SIZE = 25;

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [windowSize, setWindowSize] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live, so a guest arriving right now shows up without a reload.
  useEffect(() => {
    setError(null);
    return subscribeToUsers(
      windowSize,
      (rows, more) => {
        setUsers(rows);
        setHasMore(more);
      },
      (cause) => {
        setUsers([]);
        setError(adminError(cause, 'Could not load users.'));
      },
    );
  }, [windowSize]);

  const loading = users === null;
  const rows = users ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">
          Anonymous guest accounts. No names, emails or phone numbers are collected.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Anonymous UID</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold">Sessions</th>
                <th className="px-4 py-3 font-semibold">Payment attempts</th>
                <th className="px-4 py-3 font-semibold">Successful</th>
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <tbody>
                {rows.length === 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No users yet. They are created automatically on the first visit.
                    </td>
                  </tr>
                )}

                {rows.map((user) => (
                  <tr key={user.uid} className="border-t border-slate-200 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{user.uid}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatRelative(user.lastSeenAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{user.sessionCount}</td>
                    <td className="px-4 py-3 text-slate-700">{user.paymentAttempts}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {user.successfulPayments}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {hasMore && !loading && (
          <div className="flex justify-center border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={() => setWindowSize((size) => size + PAGE_SIZE)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
