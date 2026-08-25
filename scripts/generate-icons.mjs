#!/usr/bin/env node
/**
 * Generates the PWA icon set as real PNG files with no image dependencies.
 *
 * The icons are drawn analytically (gradient background + a heart mark) into an
 * RGBA buffer, which is then encoded as a PNG using Node's built-in zlib.
 *
 *   npm run icons
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/* --------------------------------------------------------------- PNG encoder */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes an RGBA pixel buffer (width * height * 4) as a PNG. */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  // Each scanline is prefixed with filter type 0 (None).
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ drawing */

const BRAND_A = [225, 29, 111]; // #e11d6f
const BRAND_B = [124, 58, 237]; // #7c3aed

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Signed "inside" test for a heart, using the classic implicit curve
 * (x + y - 1) - x y  <= 0, evaluated in normalised coordinates.
 */
function heartValue(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y;
}

/** Rounded-square mask so non-maskable icons look like an app tile. */
function roundedSquareAlpha(px, py, size, radius) {
  const dx = Math.max(radius - px, px - (size - radius), 0);
  const dy = Math.max(radius - py, py - (size - radius), 0);
  const distance = Math.hypot(dx, dy);
  // 1px feather keeps the corner from looking jagged without a real rasteriser.
  return Math.max(0, Math.min(1, radius - distance + 0.5));
}

function drawIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  // Maskable icons must survive an aggressive circular crop, so the artwork
  // sits inside the safe zone and the background bleeds to the full square.
  const radius = maskable ? 0 : size * 0.22;
  const heartScale = maskable ? 0.17 : 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;

      const gradientT = (x / size) * 0.35 + (y / size) * 0.65;
      const [r, g, b] = mix(BRAND_A, BRAND_B, gradientT);

      let alpha = radius > 0 ? roundedSquareAlpha(x + 0.5, y + 0.5, size, radius) : 1;

      // Heart glyph, centred and slightly raised.
      const nx = (x + 0.5 - size / 2) / (size * heartScale);
      const ny = -(y + 0.5 - size * 0.455) / (size * heartScale);
      const inside = heartValue(nx, ny) <= 0;

      if (inside) {
        rgba[index] = 255;
        rgba[index + 1] = 255;
        rgba[index + 2] = 255;
        rgba[index + 3] = Math.round(255 * alpha);
      } else {
        rgba[index] = r;
        rgba[index + 1] = g;
        rgba[index + 2] = b;
        rgba[index + 3] = Math.round(255 * alpha);
      }
    }
  }

  return encodePng(size, size, rgba);
}

/* --------------------------------------------------------------- OG cover */

function drawOgCover(width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const [r, g, b] = mix(BRAND_A, BRAND_B, (x / width) * 0.6 + (y / height) * 0.4);

      const nx = (x + 0.5 - width / 2) / (height * 0.3);
      const ny = -(y + 0.5 - height * 0.5) / (height * 0.3);
      const inside = heartValue(nx, ny) <= 0;

      rgba[index] = inside ? 255 : r;
      rgba[index + 1] = inside ? 255 : g;
      rgba[index + 2] = inside ? 255 : b;
      rgba[index + 3] = 255;
    }
  }
  return encodePng(width, height, rgba);
}

/* -------------------------------------------------------------------- run */

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ['icon-192.png', drawIcon(192, { maskable: false })],
  ['icon-512.png', drawIcon(512, { maskable: false })],
  ['icon-maskable-512.png', drawIcon(512, { maskable: true })],
  ['apple-touch-icon.png', drawIcon(180, { maskable: false })],
  ['og-cover.png', drawOgCover(1200, 630)],
];

for (const [name, buffer] of outputs) {
  writeFileSync(join(OUT_DIR, name), buffer);
  console.log(`wrote public/icons/${name} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// Crisp vector favicon for desktop browsers.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e11d6f"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path fill="#fff" d="M32 49.5 14.8 32.3a10.6 10.6 0 0 1 15-15L32 19.5l2.2-2.2a10.6 10.6 0 0 1 15 15Z"/>
</svg>
`;
writeFileSync(join(OUT_DIR, 'favicon.svg'), favicon);
console.log('wrote public/icons/favicon.svg');
