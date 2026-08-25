import type { SVGProps } from 'react';

/**
 * Inline icon set. Hand-rolled instead of pulling an icon package so the bundle
 * only ever carries the glyphs actually used.
 */

export type IconName =
  | 'phone'
  | 'chat'
  | 'video'
  | 'home'
  | 'compass'
  | 'user'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'check-circle'
  | 'shield'
  | 'heart'
  | 'search'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'star'
  | 'x'
  | 'alert'
  | 'clock'
  | 'upload'
  | 'image'
  | 'logout'
  | 'users'
  | 'card'
  | 'settings'
  | 'menu'
  | 'refresh'
  | 'flag'
  | 'ban'
  | 'eye'
  | 'eye-off'
  | 'grid'
  | 'wifi-off'
  | 'lock'
  | 'sparkle';

const PATHS: Record<IconName, string> = {
  phone:
    'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1.3 1.3 0 0 1 1.3-.3c1.4.5 3 .7 4.5.7.7 0 1.3.6 1.3 1.3V20c0 .7-.6 1.3-1.3 1.3C11.3 21.3 2.7 12.7 2.7 2.3 2.7 1.6 3.3 1 4 1h3.1c.7 0 1.3.6 1.3 1.3 0 1.6.2 3.1.7 4.5.1.4 0 .9-.3 1.3l-2.2 2.7Z',
  chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9.1 9.1 0 0 1-3.7-.8L3 21l1.9-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z',
  video: 'M23 7.5 16 12l7 4.5v-9ZM3 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z',
  home: 'M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-6.6v6H4.5A1.5 1.5 0 0 1 3 20v-9.5Z',
  compass: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Zm3.9-13.4-2.2 5.6-5.6 2.2 2.2-5.6 5.6-2.2Z',
  user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.6-8 5.8V21h16v-1.2c0-3.2-3.6-5.8-8-5.8Z',
  'chevron-left': 'M15 5 8 12l7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  check: 'M4.5 12.8 9.2 17.5 19.5 7',
  'check-circle': 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Zm-4.5-9.7 3.2 3.2 5.8-6',
  shield: 'M12 2.5 20 6v6c0 4.8-3.3 8.6-8 9.5-4.7-.9-8-4.7-8-9.5V6l8-3.5Zm-1.3 12.2 5-5',
  heart:
    'M12 20.7 4.2 13a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1A4.8 4.8 0 0 1 19.8 13L12 20.7Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.5-1.5L21 21',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L20 8l-4-4L4 16v4Z',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14',
  star: 'm12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.5Z',
  x: 'M6 6l12 12M18 6 6 18',
  alert: 'M12 3.5 22 20H2L12 3.5Zm0 6v5m0 3v.5',
  clock: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM12 7v5.4l3.5 2',
  upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  image: 'M4 5h16v14H4V5Zm0 10 4.5-4.5 4 4L15 12l5 5',
  logout: 'M15 16.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3.5M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5',
  users:
    'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.9 0-7 2.2-7 5v1h14v-1c0-2.8-3.1-5-7-5Zm8.5-2.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm4.5 8.5v-1c0-2-1.8-3.7-4.4-4.3',
  card: 'M3 6h18v12H3V6Zm0 4.5h18M6.5 15h3',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8.2-1.6.1-1.6-.1-1.6 2-1.5-2-3.4-2.4.8a8 8 0 0 0-2.8-1.6L14.6 2H9.4l-.4 2.7a8 8 0 0 0-2.8 1.6l-2.4-.8-2 3.4 2 1.5-.1 1.6.1 1.6-2 1.5 2 3.4 2.4-.8a8 8 0 0 0 2.8 1.6l.4 2.7h5.2l.4-2.7a8 8 0 0 0 2.8-1.6l2.4.8 2-3.4-2-1.5Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  flag: 'M5 21V4m0 0h11l-1.5 3.5L16 11H5',
  ban: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM5.5 5.5l13 13',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Zm10 2.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
  'eye-off': 'M3 3l18 18M10.6 10.7a2.8 2.8 0 0 0 3.8 3.8M6.3 6.5C3.8 8.2 2 12 2 12s3.6 6.5 10 6.5c1.7 0 3.2-.5 4.5-1.1M20.4 15.4C21.4 13.9 22 12 22 12s-3.6-6.5-10-6.5c-.7 0-1.4.1-2 .2',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  'wifi-off': 'M3 3l18 18M12 18.5v.01M8 14.5a5.6 5.6 0 0 1 3-1.4M4.5 10.8A11 11 0 0 1 8 8.7m11.5 2.1a11 11 0 0 0-3.7-2.3M16 14.5a5.6 5.6 0 0 0-1.4-1',
  lock: 'M7 10.5V7.8a5 5 0 0 1 10 0v2.7M5.5 10.5h13v10h-13v-10Z',
  sparkle: 'M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5ZM19 16l.8 2.3 2.2.7-2.2.7-.8 2.3-.8-2.3-2.2-.7 2.2-.7L19 16Z',
};

const FILLED = new Set<IconName>(['home', 'user', 'compass', 'star', 'heart', 'phone', 'chat', 'users']);

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  /** Force fill/stroke rendering when the default for this glyph is wrong. */
  filled?: boolean;
}

export function Icon({ name, size = 20, filled, className, ...rest }: IconProps) {
  const useFill = filled ?? FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={useFill ? 'currentColor' : 'none'}
      stroke={useFill ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
