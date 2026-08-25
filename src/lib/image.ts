/**
 * Client-side image compression.
 *
 * Firebase Storage requires the paid Blaze plan, so partner photos are stored
 * as data URLs in Firestore instead, which the free Spark plan covers. That
 * makes size the whole game: a Firestore document is capped at 1 MiB, and
 * base64 inflates bytes by about a third.
 *
 * So every photo is resized and re-encoded in the browser until it fits a tight
 * budget. WebP where the browser supports it, JPEG otherwise.
 */

/** Longest edge, in pixels. Enough for a 4:5 card on a 3x phone screen. */
const MAX_EDGE = 900;

/** Budget for the finished data URL, in characters (≈ bytes). */
const PHOTO_BUDGET_BYTES = 110_000;

/** Refuse anything that still will not fit after every attempt. */
const HARD_LIMIT_BYTES = 240_000;

const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.44, 0.36];

export class ImageTooLargeError extends Error {}
export class ImageDecodeError extends Error {}

function supportsWebp(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> path — some browsers reject certain formats.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageDecodeError('This image could not be read. Try a JPG or PNG.'));
    };
    image.src = url;
  });
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * Compresses `file` into a data URL small enough to live inside a Firestore
 * document. Tries progressively lower quality, then progressively smaller
 * dimensions, and gives up rather than writing something that would be rejected.
 */
export async function compressToDataUrl(file: File): Promise<{ dataUrl: string; bytes: number }> {
  const source = await decode(file);
  const naturalWidth = 'width' in source ? source.width : 0;
  const naturalHeight = 'height' in source ? source.height : 0;

  if (!naturalWidth || !naturalHeight) {
    throw new ImageDecodeError('This image could not be read. Try a JPG or PNG.');
  }

  const mime = supportsWebp() ? 'image/webp' : 'image/jpeg';
  let best: string | null = null;

  for (const maxEdge of [MAX_EDGE, 720, 560]) {
    const { width, height } = scaledSize(naturalWidth, naturalHeight, maxEdge);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new ImageDecodeError('Your browser could not process this image.');

    // White backdrop so transparent PNGs do not turn black once flattened.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(source as CanvasImageSource, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const dataUrl = canvas.toDataURL(mime, quality);
      if (!best || dataUrl.length < best.length) best = dataUrl;
      if (dataUrl.length <= PHOTO_BUDGET_BYTES) {
        if ('close' in source) source.close();
        return { dataUrl, bytes: dataUrl.length };
      }
    }
  }

  if ('close' in source) source.close();

  if (best && best.length <= HARD_LIMIT_BYTES) return { dataUrl: best, bytes: best.length };

  throw new ImageTooLargeError(
    'This image is too detailed to store. Try a smaller or simpler photo.',
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
