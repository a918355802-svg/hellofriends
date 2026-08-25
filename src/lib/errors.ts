/**
 * Turns any thrown value into a short, friendly, non-technical message.
 * Raw Firebase/network errors are logged for developers but never surfaced.
 */

const FIREBASE_MESSAGES: Record<string, string> = {
  'permission-denied': "You don't have access to do that.",
  unauthenticated: 'Your session expired. Please reopen the app.',
  unavailable: 'Network looks unstable. Please try again.',
  'deadline-exceeded': 'That took too long. Please try again.',
  'resource-exhausted': 'We are getting a lot of requests. Please try again shortly.',
  // Almost always a missing composite index on first deploy. Firebase prints a
  // one-click creation link in the console, so point at it rather than leaving
  // the owner guessing — a visitor never sees this once the index exists.
  'failed-precondition':
    'This needs a Firestore index. Open the browser console — Firebase prints a link that creates it, or run: firebase deploy --only firestore:indexes',
  'not-found': 'We could not find what you were looking for.',
  'already-exists': 'That already exists.',
  cancelled: 'The request was cancelled.',
  'auth/invalid-email': 'That email address does not look right.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
  'auth/network-request-failed': 'Network looks unstable. Please try again.',
  // Setup mistakes. A visitor never reaches these once the project is wired up
  // correctly, so the messages name the exact fix rather than staying vague —
  // the only person who ever sees them is the owner, mid-deploy.
  'auth/operation-not-allowed':
    'Sign-in method disabled. Enable Anonymous in Firebase → Authentication → Sign-in method.',
  'auth/admin-restricted-operation':
    'Anonymous sign-in is disabled. Enable it in Firebase → Authentication → Sign-in method.',
  'auth/configuration-not-found':
    'Firebase Authentication is not set up yet. Open Firebase → Authentication → Get started.',
  'auth/api-key-not-valid': 'The Firebase API key is wrong. Check VITE_FIREBASE_API_KEY, then redeploy.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    'The Firebase API key is wrong. Check VITE_FIREBASE_API_KEY, then redeploy.',
  'auth/invalid-api-key': 'The Firebase API key is wrong. Check VITE_FIREBASE_API_KEY, then redeploy.',
  'auth/unauthorized-domain':
    'This domain is not authorised. Add it in Firebase → Authentication → Settings → Authorized domains.',
  'auth/requests-from-referer-are-blocked':
    'The API key is restricted. Allow this domain in Google Cloud Console → Credentials.',
};

function codeOf(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code.replace(/^firestore\//, '').toLowerCase() : null;
}

/**
 * Same as `friendlyError`, but for the dashboard, where `permission-denied`
 * means something specific and fixable.
 *
 * The admin is signed in, so a denial is not "you are not allowed" — it is
 * "`firestore.rules` still has the placeholder email, so the rules consider
 * nobody an admin". That is the single most common thing to go wrong on a first
 * deploy, and the generic wording sends the owner looking in the wrong place.
 */
export function adminError(error: unknown, fallback?: string): string {
  if (codeOf(error) === 'permission-denied') {
    return (
      'Firestore refused this. Open firestore.rules, replace SET_YOUR_ADMIN_EMAIL_HERE with ' +
      'your admin email (the same one as VITE_ADMIN_EMAIL), then run: ' +
      'firebase deploy --only firestore:rules'
    );
  }
  return friendlyError(error, fallback);
}

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  // Logged in production too. These are client-side SDK errors with nothing
  // sensitive in them, and without the raw code a misconfigured deployment is
  // undebuggable from the outside.
  console.error('[hellofriends]', error);

  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      const normalised = code.replace(/^firestore\//, '').toLowerCase();
      if (FIREBASE_MESSAGES[normalised]) return FIREBASE_MESSAGES[normalised];
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      if (/network|fetch|offline/i.test(message)) {
        return 'Network looks unstable. Please check your connection.';
      }
      // Backstop: an object stringified somewhere upstream is worse than
      // saying nothing, so never let it reach the screen.
      if (message.includes('[object ')) return fallback;
      // API routes return already-friendly messages in `error`.
      if (message.length < 200 && !/^Firebase:/.test(message)) return message;
    }
  }

  return fallback;
}
