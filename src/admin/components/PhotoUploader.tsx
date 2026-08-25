import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LazyImage } from '@/components/ui/LazyImage';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { friendlyError } from '@/lib/errors';
import { formatBytes } from '@/lib/image';
import {
  InvalidImageError,
  isInlinePhoto,
  normaliseExternalUrl,
  preparePhoto,
} from '@/services/photos.service';
import { inputClass } from './AdminField';

/**
 * Picks a partner photo without Firebase Storage (which needs the paid Blaze
 * plan). Two routes:
 *
 *   Upload  the file is resized and re-encoded in the browser, then held as a
 *           data URL and written into Firestore when the profile is saved.
 *   Link    an image already hosted elsewhere, used as-is.
 *
 * Nothing leaves the browser until the admin presses Save, so an abandoned form
 * cannot leave stray data behind.
 */
export function PhotoUploader({
  photo,
  onChange,
  label = 'Profile photo',
  hint,
}: {
  photo: string | null;
  onChange: (photo: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await preparePhoto(file);
      onChange(prepared.url);
      setBytes(prepared.bytes);
      toast.success(`Photo ready (${formatBytes(prepared.bytes)}).`);
    } catch (cause) {
      toast.error(
        cause instanceof InvalidImageError
          ? cause.message
          : friendlyError(cause, 'Could not process that photo.'),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const applyLink = () => {
    try {
      const url = normaliseExternalUrl(link);
      onChange(url);
      setBytes(null);
      setLinkMode(false);
      setLink('');
    } catch (cause) {
      toast.error(cause instanceof InvalidImageError ? cause.message : 'That link is not valid.');
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-slate-700">{label}</p>

      <div className="flex items-start gap-4">
        <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {photo ? (
            <LazyImage src={photo} alt="Selected photo" className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
              <Icon name="image" size={22} />
              <span className="text-[11px]">No photo</span>
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70 text-white">
              <Spinner size={20} />
              <span className="text-[11px] font-semibold">Compressing…</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Icon name="upload" size={15} />
              {photo ? 'Replace' : 'Upload'}
            </button>

            <button
              type="button"
              onClick={() => setLinkMode((value) => !value)}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <Icon name="grid" size={15} />
              Use link
            </button>

            {photo && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setBytes(null);
                }}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 px-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                <Icon name="trash" size={15} />
                Remove
              </button>
            )}
          </div>

          {linkMode && (
            <div className="mt-2.5 flex gap-2">
              <input
                className={inputClass}
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              <button
                type="button"
                onClick={applyLink}
                className="inline-flex h-11 shrink-0 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                Use
              </button>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-500">
            {hint ?? 'JPG, PNG, WebP or AVIF. Portrait 4:5 looks best.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {photo && isInlinePhoto(photo)
              ? `Stored in Firestore${bytes ? ` · ${formatBytes(bytes)}` : ''} — resized automatically, no paid plan needed.`
              : photo
                ? 'Loaded from an external link.'
                : 'Large photos are resized in your browser before saving.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Only upload photos you have the rights to use.
          </p>
        </div>
      </div>
    </div>
  );
}
