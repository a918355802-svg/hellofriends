import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { LazyImage } from '@/components/ui/LazyImage';
import { Chip, StatusPill, VerifiedBadge } from '@/components/ui/Badge';
import { Field, Toggle, inputClass, textareaClass } from '../components/AdminField';
import { PhotoUploader } from '../components/PhotoUploader';
import { AdminLoading } from '../components/AdminLoading';
import { useToast } from '@/hooks/useToast';
import { friendlyError } from '@/lib/errors';
import {
  createPartner,
  fetchPartnerById,
  updatePartner,
} from '@/services/partners.service';
import {
  MAX_GALLERY_PHOTOS,
  fetchPartnerGallery,
  savePartnerGallery,
} from '@/services/photos.service';
import type { Gender, PartnerInput } from '@/types';

interface FormState {
  name: string;
  age: string;
  gender: Gender;
  bio: string;
  interests: string;
  photo: string | null;
  gallery: string[];
  online: boolean;
  verified: boolean;
  featured: boolean;
  active: boolean;
  priority: string;
}

const EMPTY: FormState = {
  name: '',
  age: '',
  gender: 'female',
  bio: '',
  interests: '',
  photo: null,
  gallery: [],
  online: true,
  verified: false,
  featured: false,
  active: true,
  priority: '0',
};

const SUGGESTED_INTERESTS = [
  'Music',
  'Movies',
  'Travel',
  'Cooking',
  'Reading',
  'Fitness',
  'Photography',
  'Dancing',
  'Gaming',
  'Art',
  'Cricket',
  'Coffee',
];

export default function PartnerFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;

    // The gallery lives in its own document so its bytes never load with the
    // public feed; fetch both together when editing.
    Promise.all([fetchPartnerById(id), fetchPartnerGallery(id)])
      .then(([partner, gallery]) => {
        if (cancelled) return;
        if (!partner) {
          setLoadError('This partner no longer exists.');
          return;
        }
        setForm({
          name: partner.name,
          age: String(partner.age || ''),
          gender: partner.gender,
          bio: partner.bio,
          interests: partner.interests.join(', '),
          photo: partner.photoUrl || null,
          gallery,
          online: partner.online,
          verified: partner.verified,
          featured: partner.featured,
          active: partner.active,
          priority: String(partner.priority ?? 0),
        });
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(friendlyError(cause, 'Could not load this partner.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  const interestList = useMemo(
    () =>
      form.interests
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    [form.interests],
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const age = Number(form.age);

    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.age || Number.isNaN(age)) next.age = 'Age is required.';
    else if (age < 18) next.age = 'Partners must be 18 or older.';
    else if (age > 99) next.age = 'Please enter a realistic age.';
    if (!form.bio.trim()) next.bio = 'A short bio helps the profile perform.';
    if (!form.photo) next.photo = 'A profile photo is required.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    const payload: PartnerInput = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      bio: form.bio.trim(),
      interests: interestList,
      photoUrl: form.photo ?? '',
      online: form.online,
      verified: form.verified,
      featured: form.featured,
      active: form.active,
      priority: Number(form.priority) || 0,
    };

    try {
      // Gallery is written after the profile, because a new partner has no id
      // until it exists.
      if (mode === 'create') {
        const newId = await createPartner(payload);
        await savePartnerGallery(newId, form.gallery);
        toast.success(`${payload.name} was added.`);
      } else if (id) {
        await updatePartner(id, payload);
        await savePartnerGallery(id, form.gallery);
        toast.success(`${payload.name} was updated.`);
      }
      navigate('/admin/partners');
    } catch (cause) {
      toast.error(friendlyError(cause, 'Could not save this partner.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading label="Loading partner…" />;

  if (loadError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-semibold text-slate-800">{loadError}</p>
        <Link
          to="/admin/partners"
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Back to partners
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/partners"
            aria-label="Back to partners"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-100"
          >
            <Icon name="chevron-left" size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === 'create' ? 'Add partner' : 'Edit partner'}
            </h1>
            <p className="text-sm text-slate-500">
              Everything here is stored in Firestore — no code changes needed.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Spinner size={15} /> : <Icon name="check" size={16} />}
          {mode === 'create' ? 'Create partner' : 'Save changes'}
        </button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Basic information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={errors.name}>
                <input
                  className={inputClass}
                  value={form.name}
                  maxLength={40}
                  onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                  placeholder="Priya"
                />
              </Field>

              <Field label="Age" required error={errors.age} hint="Must be 18 or above.">
                <input
                  className={inputClass}
                  type="number"
                  min={18}
                  max={99}
                  value={form.age}
                  onChange={(event) => setForm((f) => ({ ...f, age: event.target.value }))}
                  placeholder="22"
                />
              </Field>
            </div>

            <Field label="Gender">
              <select
                className={inputClass}
                value={form.gender}
                onChange={(event) =>
                  setForm((f) => ({ ...f, gender: event.target.value as Gender }))
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field
              label="Bio"
              required
              error={errors.bio}
              hint={`${form.bio.length}/240 characters. Keep it warm and honest.`}
            >
              <textarea
                className={textareaClass}
                rows={3}
                maxLength={240}
                value={form.bio}
                onChange={(event) => setForm((f) => ({ ...f, bio: event.target.value }))}
                placeholder="Love music, movies, travelling and meeting new people."
              />
            </Field>

            <Field label="Interests" hint="Comma separated · up to 12.">
              <input
                className={inputClass}
                value={form.interests}
                onChange={(event) => setForm((f) => ({ ...f, interests: event.target.value }))}
                placeholder="Music, Movies, Travel"
              />
            </Field>

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_INTERESTS.filter((item) => !interestList.includes(item)).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      interests: f.interests.trim()
                        ? `${f.interests.replace(/,\s*$/, '')}, ${item}`
                        : item,
                    }))
                  }
                  className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  + {item}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Photos</h2>

            <PhotoUploader
              photo={form.photo}
              onChange={(photo) => {
                setForm((f) => ({ ...f, photo }));
                setErrors((e) => ({ ...e, photo: '' }));
              }}
            />
            {errors.photo && <p className="text-xs font-medium text-red-600">{errors.photo}</p>}

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Additional photos ({form.gallery.length}/{MAX_GALLERY_PHOTOS})
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {form.gallery.map((photo, index) => (
                  <PhotoUploader
                    key={index}
                    label={`Photo ${index + 2}`}
                    photo={photo}
                    hint="Shown in the gallery on the profile page."
                    onChange={(next) =>
                      setForm((f) => ({
                        ...f,
                        gallery: next
                          ? f.gallery.map((item, i) => (i === index ? next : item))
                          : f.gallery.filter((_, i) => i !== index),
                      }))
                    }
                  />
                ))}

                {form.gallery.length < MAX_GALLERY_PHOTOS && (
                  <PhotoUploader
                    label="Add another photo"
                    photo={null}
                    hint="Optional."
                    onChange={(next) =>
                      next && setForm((f) => ({ ...f, gallery: [...f.gallery, next] }))
                    }
                  />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Status &amp; visibility</h2>

            <Toggle
              label="Online"
              description="Shows a green Online badge on the public app right away."
              checked={form.online}
              onChange={(online) => setForm((f) => ({ ...f, online }))}
            />
            <Toggle
              label="Active"
              description="Turn off to hide this profile from the public app without deleting it."
              checked={form.active}
              onChange={(active) => setForm((f) => ({ ...f, active }))}
            />
            <Toggle
              label="Featured"
              description="Featured profiles appear near the top of the discovery feed."
              checked={form.featured}
              onChange={(featured) => setForm((f) => ({ ...f, featured }))}
            />
            <Toggle
              label="Verified badge"
              description="Only enable when you have actually verified this profile."
              checked={form.verified}
              onChange={(verified) => setForm((f) => ({ ...f, verified }))}
            />

            <Field label="Sort priority" hint="Higher numbers appear first. Default 0.">
              <input
                className={inputClass}
                type="number"
                value={form.priority}
                onChange={(event) => setForm((f) => ({ ...f, priority: event.target.value }))}
              />
            </Field>
          </section>
        </div>

        {/* Live preview: exactly what a visitor will see. */}
        <aside className="xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Profile preview
            </p>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative">
                {form.photo ? (
                  <LazyImage
                    src={form.photo}
                    alt={form.name || 'Preview'}
                    fallbackName={form.name}
                    className="aspect-[4/5] w-full"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center bg-slate-100 text-slate-400">
                    <Icon name="image" size={30} />
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />

                <div className="absolute left-3 top-3 flex gap-1.5">
                  {form.featured && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                      ⭐ Featured
                    </span>
                  )}
                  {form.verified && <VerifiedBadge onPhoto />}
                </div>

                <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white">
                  {form.online ? '🟢 Online' : '⚫ Offline'}
                </span>

                <p className="absolute inset-x-4 bottom-3 text-xl font-bold text-white">
                  {form.name || 'Name'}
                  {form.age && `, ${form.age}`}
                </p>
              </div>

              <div className="space-y-3 p-4">
                <StatusPill online={form.online} />
                <p className="text-sm leading-relaxed text-slate-600">
                  {form.bio || 'The bio will appear here.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {interestList.map((interest) => (
                    <Chip key={interest}>{interest}</Chip>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {['📞 Call', '💬 Chat', '🎥 Video'].map((label, index) => (
                    <span
                      key={label}
                      className={`flex h-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                        index === 2
                          ? 'bg-brand text-white'
                          : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {!form.active && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This profile is inactive and will not appear on the public app.
              </p>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}
