import { missingFirebaseKeys } from '@/config/env';
import { BRAND } from '@/config/brand';

/**
 * Shown instead of the app when the Firebase web config is missing.
 * This is a developer-facing screen — it names the exact variables to add
 * rather than failing with an opaque runtime error.
 */
export function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-xl font-extrabold">{BRAND.name} is not connected yet</h1>
      <p className="text-sm text-muted">
        Add the Firebase web configuration to your environment, then redeploy. Copy the values from
        Firebase Console → Project settings → Your apps → Web app.
      </p>

      <div className="rounded-2xl bg-elevated p-4 ring-1 ring-line">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          Missing variables
        </p>
        <ul className="space-y-1 font-mono text-xs">
          {missingFirebaseKeys.map((key) => (
            <li key={key} className="text-danger">
              {key}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted">
        Locally: put them in a <code className="font-mono">.env.local</code> file (see{' '}
        <code className="font-mono">.env.example</code>). On Vercel: Project → Settings →
        Environment Variables, then redeploy.
      </p>
    </div>
  );
}
