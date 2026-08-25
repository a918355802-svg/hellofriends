import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from '@/config/firebase';
import { compressToDataUrl, ImageDecodeError, ImageTooLargeError } from '@/lib/image';

/**
 * Partner photos, stored in Firestore instead of Firebase Storage (which needs
 * the paid Blaze plan).
 *
 * Layout:
 *   partners/{id}.photoUrl            main photo, inline so one feed read
 *                                     renders the card with no extra request
 *   partners/{id}/media/gallery       extra photos, in their own document so
 *                                     their bytes never load with the feed
 *
 * Splitting them matters twice over: it keeps the discovery feed small on
 * mobile data, and it keeps both documents clear of Firestore's 1 MiB cap.
 */

const MAX_GALLERY_PHOTOS = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export class InvalidImageError extends Error {}

function validateImage(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new InvalidImageError('Please choose a JPG, PNG, WebP or AVIF image.');
  }
  // Only a sanity bound on the *input*; compression decides the stored size.
  if (file.size > 25 * 1024 * 1024) {
    throw new InvalidImageError('That file is very large. Please pick an image under 25 MB.');
  }
}

/**
 * Turns a picked file into a storable data URL. Runs entirely in the browser —
 * nothing is uploaded until the admin saves the profile.
 */
export async function preparePhoto(file: File): Promise<{ url: string; bytes: number }> {
  validateImage(file);
  try {
    const { dataUrl, bytes } = await compressToDataUrl(file);
    return { url: dataUrl, bytes };
  } catch (error) {
    if (error instanceof ImageTooLargeError || error instanceof ImageDecodeError) {
      throw new InvalidImageError(error.message);
    }
    throw error;
  }
}

/** True for a photo held inline rather than fetched from a remote host. */
export function isInlinePhoto(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Accepts an externally hosted image instead of an upload — useful when the
 * owner already keeps photos somewhere (or wants to skip the size budget).
 */
export function normaliseExternalUrl(input: string): string {
  const url = input.trim();
  if (!url) throw new InvalidImageError('Please paste an image link.');
  if (!/^https:\/\//i.test(url)) {
    throw new InvalidImageError('The link must start with https://');
  }
  return url;
}

function galleryRef(partnerId: string) {
  return doc(getDb(), 'partners', partnerId, 'media', 'gallery');
}

export async function fetchPartnerGallery(partnerId: string): Promise<string[]> {
  const snapshot = await getDoc(galleryRef(partnerId));
  if (!snapshot.exists()) return [];
  const photos = snapshot.data()?.photos;
  return Array.isArray(photos) ? photos.filter((item) => typeof item === 'string') : [];
}

export async function savePartnerGallery(partnerId: string, photos: string[]): Promise<void> {
  const trimmed = photos.filter(Boolean).slice(0, MAX_GALLERY_PHOTOS);

  if (trimmed.length === 0) {
    // Nothing left to show — drop the document rather than leaving an empty one.
    await deleteDoc(galleryRef(partnerId)).catch(() => undefined);
    return;
  }

  await setDoc(galleryRef(partnerId), {
    photos: trimmed,
    updatedAt: serverTimestamp(),
  });
}

export { MAX_GALLERY_PHOTOS };
