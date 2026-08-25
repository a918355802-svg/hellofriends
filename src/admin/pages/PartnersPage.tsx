import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LazyImage } from '@/components/ui/LazyImage';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { adminError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import {
  deletePartner,
  subscribeToAdminPartners,
  setPartnerActive,
  setPartnerFeatured,
  setPartnerOnline,
} from '@/services/partners.service';
import { TableSkeleton } from '../components/AdminLoading';
import type { Partner, PartnerFilters } from '@/types';

const DEFAULT_FILTERS: PartnerFilters = {
  search: '',
  status: 'all',
  activeState: 'all',
  featured: 'all',
  sort: 'newest',
};

const selectClass =
  'h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-900';

const PAGE_SIZE = 20;

export default function PartnersPage() {
  const toast = useToast();

  const [filters, setFilters] = useState<PartnerFilters>(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 350);

  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [windowSize, setWindowSize] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const effectiveFilters: PartnerFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  // A filter change starts a new window, so a narrow view never inherits a
  // window that was grown on a wider one.
  useEffect(() => {
    setWindowSize(PAGE_SIZE);
    setPartners(null);
  }, [effectiveFilters]);

  /**
   * Live listener, so a partner saved on the form page — or toggled in another
   * tab — is reflected here without a reload.
   */
  useEffect(() => {
    setError(null);
    return subscribeToAdminPartners(
      effectiveFilters,
      windowSize,
      (rows, more) => {
        setPartners(rows);
        setHasMore(more);
      },
      (cause) => {
        setPartners([]);
        setError(adminError(cause, 'Could not load partners.'));
      },
    );
  }, [effectiveFilters, windowSize]);

  const loading = partners === null;
  const rows = partners ?? [];

  /**
   * The write is all this does. The listener puts the new value on screen, so
   * there is no optimistic copy to roll back when a write is rejected — the row
   * simply never changes.
   */
  const toggle = async (
    partner: Partner,
    field: 'online' | 'active' | 'featured',
    value: boolean,
  ) => {
    setBusyId(partner.id);
    try {
      if (field === 'online') await setPartnerOnline(partner.id, value);
      if (field === 'active') await setPartnerActive(partner.id, value);
      if (field === 'featured') await setPartnerFeatured(partner.id, value);

      const labels = {
        online: value ? 'is now Online' : 'is now Offline',
        active: value ? 'is now visible' : 'is now hidden',
        featured: value ? 'is now Featured' : 'is no longer Featured',
      };
      toast.success(`${partner.name} ${labels[field]}.`);
    } catch (cause) {
      toast.error(adminError(cause, 'Could not update this partner.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      // deletePartner also removes the gallery child document — Firestore does
      // not cascade into subcollections on its own.
      await deletePartner(pendingDelete.id);
      // The listener drops the row; nothing to remove by hand.
      toast.success(`${pendingDelete.name} was deleted.`);
      setPendingDelete(null);
    } catch (cause) {
      toast.error(adminError(cause, 'Could not delete this partner.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partners</h1>
          <p className="text-sm text-slate-500">
            Create and manage profiles. Changes appear on the public app immediately.
          </p>
        </div>
        <Link
          to="/admin/partners/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Icon name="plus" size={16} />
          Add partner
        </Link>
      </header>

      <section className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search partners by name</span>
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((f) => ({ ...f, search: event.target.value }))}
            placeholder="Search by name…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-900"
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((f) => ({ ...f, status: event.target.value as PartnerFilters['status'] }))
          }
          className={selectClass}
          aria-label="Filter by online status"
        >
          <option value="all">All status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>

        <select
          value={filters.activeState}
          onChange={(event) =>
            setFilters((f) => ({
              ...f,
              activeState: event.target.value as PartnerFilters['activeState'],
            }))
          }
          className={selectClass}
          aria-label="Filter by visibility"
        >
          <option value="all">All visibility</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.featured}
          onChange={(event) =>
            setFilters((f) => ({
              ...f,
              featured: event.target.value as PartnerFilters['featured'],
            }))
          }
          className={selectClass}
          aria-label="Filter by featured"
        >
          <option value="all">All profiles</option>
          <option value="featured">Featured</option>
          <option value="not-featured">Not featured</option>
        </select>

        <select
          value={filters.sort}
          onChange={(event) =>
            setFilters((f) => ({ ...f, sort: event.target.value as PartnerFilters['sort'] }))
          }
          className={selectClass}
          aria-label="Sort"
          disabled={Boolean(debouncedSearch)}
        >
          <option value="newest">Newest first</option>
          <option value="priority">Priority</option>
          <option value="name">Name A–Z</option>
        </select>

        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Icon name="refresh" size={15} />
          Reset
        </button>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Profile</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Visible</th>
                <th className="px-4 py-3 font-semibold">Featured</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : (
              <tbody>
                {rows.length === 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="font-medium text-slate-700">No partners match these filters</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try clearing the filters, or add your first partner.
                      </p>
                    </td>
                  </tr>
                )}

                {rows.map((partner) => (
                  <tr key={partner.id} className="border-t border-slate-200 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <LazyImage
                          src={partner.photoUrl}
                          alt={partner.name}
                          fallbackName={partner.name}
                          className="h-11 w-11 shrink-0 rounded-xl"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {partner.name}
                            {partner.age > 0 && `, ${partner.age}`}
                            {partner.verified && (
                              <Icon
                                name="check-circle"
                                size={13}
                                className="ml-1 inline text-indigo-500"
                              />
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {partner.interests.slice(0, 3).join(' · ') || 'No interests'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <RowToggle
                        checked={partner.online}
                        busy={busyId === partner.id}
                        onLabel="🟢 Online"
                        offLabel="⚫ Offline"
                        onChange={(value) => toggle(partner, 'online', value)}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <RowToggle
                        checked={partner.active}
                        busy={busyId === partner.id}
                        onLabel="Active"
                        offLabel="Hidden"
                        onChange={(value) => toggle(partner, 'active', value)}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <RowToggle
                        checked={partner.featured}
                        busy={busyId === partner.id}
                        onLabel="⭐ Yes"
                        offLabel="No"
                        onChange={(value) => toggle(partner, 'featured', value)}
                      />
                    </td>

                    <td className="px-4 py-3 text-slate-600">{partner.priority}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(partner.updatedAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          to={`/admin/partners/${partner.id}/edit`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Icon name="edit" size={13} />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(partner)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Icon name="trash" size={13} />
                          Delete
                        </button>
                      </div>
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

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name ?? 'this partner'}?`}
        description={
          <>
            This permanently removes the profile and its uploaded photos. This cannot be undone.
            <br />
            <br />
            To hide the profile temporarily instead, switch <strong>Visible</strong> off.
          </>
        }
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function RowToggle({
  checked,
  onChange,
  onLabel,
  offLabel,
  busy,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  onLabel: string;
  offLabel: string;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ring-1 transition disabled:opacity-60 ${
        checked
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200'
      }`}
    >
      {checked ? onLabel : offLabel}
    </button>
  );
}
