/**
 * Single source of truth for branding, pricing and contact details.
 * Change values here — never scatter them through components.
 */

export const BRAND = {
  name: 'Hellofriends',
  tagline: 'Meet new people, make real friends',
  shortDescription:
    'Browse profiles, see who is online, and start a voice call, chat or video call.',
  supportEmail: 'support@hellofriends.app',
  supportPhone: '',
  companyName: 'Hellofriends',
  websiteUrl: 'https://hellofriends-theta.vercel.app',
  minimumAge: 18,
} as const;

/**
 * The one and only account allowed into the admin dashboard.
 *
 * Set `VITE_ADMIN_EMAIL` to the email you created in Firebase →
 * Authentication → Users. There is no allowlist and no role system: exactly
 * this address is the admin, and nothing else can become one.
 *
 * Empty means "nobody is an admin". That is deliberate — an unconfigured deploy
 * must lock the dashboard, never open it.
 *
 * Put the same address in `firestore.rules`, which is what actually enforces
 * it. The check here only decides routing and wording; a browser can lie about
 * it, the rules cannot.
 */
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase();

export const PRICING = {
  /** Interaction price in whole rupees. */
  amount: 99,
  currency: 'INR',
  currencySymbol: '₹',
} as const;

/**
 * UPI payee details — the account that receives every ₹99 payment.
 *
 * A VPA is not a secret; it is the equivalent of a bank account number for
 * *receiving* money, and it has to be visible to the payer's app anyway. The
 * env vars are optional overrides so the VPA can be changed without a code
 * edit (useful for staging).
 *
 * There is no server-side copy of any of this. The app talks to Firestore
 * directly, so the VPA and the price live only in the bundle a visitor
 * downloads, and a determined one can edit either before the intent is built.
 * That is survivable only because nothing is granted on the payer's say-so:
 * the owner reads the real credit in their own bank before approving, and the
 * Firestore rules let no one but the admin record that verdict.
 */
export const UPI = {
  payeeVpa: import.meta.env.VITE_UPI_PAYEE_VPA || 'navneetyadav8070-1@okaxis',
  // The account holder, not the brand. This is the `pn` of a person-to-person
  // UPI intent, and it should match the name the payer's app resolves from the
  // VPA itself — a brand name against a personal VPA reads as a merchant
  // collection, which is exactly what the apps restrict.
  payeeName: import.meta.env.VITE_UPI_PAYEE_NAME || 'Navneet Yadav',
} as const;

export const FEED = {
  /** Profiles fetched per Firestore page. */
  pageSize: 12,
  /** Pixels from the bottom at which the next page starts loading. */
  infiniteScrollRootMargin: '600px',
  /**
   * How many of the on-screen partners stay under a realtime listener.
   * Capped at 30 by Firestore's `in` filter limit.
   */
  realtimeWatchLimit: 30,
} as const;

export const LEGAL = {
  ageNotice: `You must be ${BRAND.minimumAge}+ to use ${BRAND.name}.`,
  lastUpdated: '2026-08-09',
} as const;
