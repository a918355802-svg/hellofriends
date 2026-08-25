# Deployment guide

Step-by-step: Firebase → environment variables → Vercel → UPI payments.
Allow about 30–40 minutes for a first-time setup.

---

## Environment variables at a glance

Every variable here is **public**. Vite copies each `VITE_` value into the
JavaScript bundle that visitors download, so none of them may be a secret —
and none need to be. The app has no backend: payments are plain UPI transfers,
and access to data is decided by `firestore.rules`.

### Public — safe in the bundle (required)

| Variable | Where to find it |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → General → Your apps → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | same place — `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | same place |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same place |
| `VITE_FIREBASE_APP_ID` | same place |

> The Firebase API key is *not* a secret. It identifies your project. Your data
> is protected by `firestore.rules`, which is why deploying those rules is not
> optional.

### Public — optional

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_MEASUREMENT_ID` | Only if you enable Google Analytics for Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Not used. Photos are stored in Firestore; Firebase Storage needs the paid plan |
| `VITE_UPI_PAYEE_VPA` | Overrides the UPI ID shown in the payment sheet |
| `VITE_UPI_PAYEE_NAME` | Display name in the UPI app (default: `Hellofriends`) |

### Admin access — REQUIRED

Exactly one account can open `/admin` — the one you create in
Firebase → Authentication → Users.

| Variable | Effect |
| --- | --- |
| `VITE_ADMIN_EMAIL` | The one account allowed into `/admin` |

You must **also** put the same address in `firestore.rules` (replace
`SET_YOUR_ADMIN_EMAIL_HERE`) and redeploy the rules — that file is the real
security boundary. Leave anything unset and nobody is an admin,
which is the safe default.

### UPI payment — optional overrides

There is **no backend and no payment gateway**, so there are no secrets to
configure. Every ₹99 goes straight to a UPI ID, and the working values are
already in the code:

| Setting | Default | Where it lives |
| --- | --- | --- |
| Receiving UPI ID | `8786546786@okhdfcbank` | `src/config/brand.ts` |
| Amount | `99` INR | `src/config/brand.ts`, pinned again in `firestore.rules` |

| Variable | Effect |
| --- | --- |
| `VITE_UPI_PAYEE_VPA` | Overrides the receiving UPI ID |
| `VITE_UPI_PAYEE_NAME` | Name shown inside the payer's UPI app |

Changing the price means editing `PRICING.amount` **and** `priceInRupees()` in
`firestore.rules` together — the rules pin it so a tampered browser cannot
record a ₹1 request as if it were the real price.

---

## 1. Create the Firebase project

1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started → Sign-in method**, then enable:
   - **Anonymous** — required, this is how guests get in.
   - **Email/Password** — required, this is how you sign in to `/admin`.
3. **Build → Firestore Database → Create database** → production mode → pick a
   region close to your users (`asia-south1` for India).
4. **Project settings → General → Your apps → Web (`</>`)** → register an app.
   Copy the config object — those are your `VITE_FIREBASE_*` values.
You do **not** need to enable Firebase Storage. It requires the paid Blaze
plan, so partner photos are compressed in the browser and stored in Firestore
instead. Everything here works on the free Spark plan.

---

## 2. Deploy the security rules and indexes

Without this step the app cannot read anything, and — more importantly —
anyone could write to your database.

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

Prefer the console? Paste `firestore.rules` into Firestore → Rules, then create
the composite indexes listed in `firestore.indexes.json` under Firestore →
Indexes.

> Index building takes a few minutes. Until the `partners` index is ready the
> feed may return an error — that is expected and resolves itself.

---

## 3. Run it locally

```bash
cp .env.example .env.local
# fill in the VITE_FIREBASE_* values and VITE_ADMIN_EMAIL
npm install
npm run dev
```

Then set up admin access:

1. Firebase Console → **Authentication** → **Sign-in method** → enable
   **Email/Password**.
2. **Users** → **Add user** → your admin email and a strong password.
3. Put that same address in `VITE_ADMIN_EMAIL` in `.env.local`, and in
   `firestore.rules` (replace `SET_YOUR_ADMIN_EMAIL_HERE`), then redeploy the
   rules.
4. Restart `npm run dev` — `VITE_` variables are read at build time.

Now sign in at `/admin` and add your profiles under **Partners → Add partner**.
That is the only way profiles are created: there is no seed script and no
service-account credential, because the dashboard writes through the same
Firestore rules as the app.

Sign in at <http://localhost:5173/admin/login>.

---

## 4. Deploy to Vercel

1. Push this repository to GitHub.
2. <https://vercel.com/new> → import the repository.
3. Framework preset **Vite** is detected; the build command (`npm run build`)
   and output directory (`dist`) come from `vercel.json`.
4. **Settings → Environment Variables** — add every variable from the tables
   above, for Production *and* Preview.
5. **Deploy.**

`vercel.json` already handles the SPA rewrite (so `/profile/abc` does not 404 on
refresh), long-lived caching for hashed assets, and basic security headers.

After deploying, add your Vercel domain to
**Firebase Console → Authentication → Settings → Authorized domains**, or
sign-in will be rejected in production.

---

## 5. Check the payment setup

The app is ready to take money as soon as it is deployed — there is nothing to
configure, because payments are plain UPI transfers.

1. Confirm the receiving UPI ID in `src/config/brand.ts` (`UPI.payeeVpa`).
   Default: `8786546786@okhdfcbank`.
2. On a real phone, open the app, tap **Video** on any profile, then
   **Pay ₹99 with UPI**. With one UPI app installed it opens straight away with
   ₹99 and the correct payee filled in; with several, the phone shows its own
   list. That list belongs to the phone — which apps appear (WhatsApp included)
   is decided by the device, and no website can add to it or remove from it.
   If nothing opens, the waiting screen has a button to try again, plus the UPI
   ID and reference for paying by hand.
3. To test with ₹1, temporarily set `PRICING.amount` in `src/config/brand.ts`
   and `priceInRupees()` in `firestore.rules` to 1, then put both back.
4. Open **Admin → Payments**. The request is already there, live — no reload —
   with a reference like `HFXXXXXXXX`.
5. Find the matching credit in your bank or UPI app, press **Review** →
   **Money received**. The user's screen flips to "Payment Successful"
   immediately, through a Firestore listener.

### Confirming payments day to day

UPI gives websites no callback, so nothing is confirmed automatically. Your
routine is:

- Open **Admin → Payments** (it opens on *All*, newest first, and updates
  itself as requests arrive).
- For each row, look for the ₹99 credit with that reference in your UPI app.
- **Money received** → the user sees success. **Not received** → the user sees a
  friendly failure with your note.

Every decision records which admin made it (`reviewedBy`), and the counters on
the user record stay correct even if you change your mind later.

### If you later want automatic confirmation

You would need a payment gateway with a webhook, and therefore a small backend —
a signed order out, a verified callback in. It can sit alongside this flow
rather than replacing it, with the manual review path kept as the fallback.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Hellofriends is not connected yet" | A `VITE_FIREBASE_*` variable is missing. The screen lists which ones. Add them and **redeploy** — Vite bakes them in at build time |
| "We could not start your session" | Anonymous sign-in is disabled, or the domain is not in Authorized domains |
| Feed stays empty | No partners yet (add them in Admin → Partners), all inactive, or the composite index is still building |
| "The query requires an index" in the console | Deploy `firestore.indexes.json`, or click the link in the error |
| Admin login says "no admin access" | The signed-in email does not equal `VITE_ADMIN_EMAIL`. Check for typos/extra spaces; the comparison is lowercase |
| Admin login says "not configured" | `VITE_ADMIN_EMAIL` is empty. Set it in Vercel and **redeploy** — `VITE_` values are baked in at build time |
| Dashboard loads but every table is empty or errors | `firestore.rules` still has `SET_YOUR_ADMIN_EMAIL_HERE`, or the rules were never deployed |
| Photo upload denied | Your admin email is missing from `firestore.rules`, or the rules were never deployed |
| "This image is too detailed to store" | The compressor could not fit it in the budget. Crop it, or paste an external link instead |
| UPI app does not open | Only works on a phone with a UPI app installed. On desktop the sheet tells the user to pay manually to the UPI ID |
| Payment stuck on pending | Expected until you confirm it in Admin → Payments. That is the design, not a bug |
| Wrong UPI ID in the app | Update `UPI_PAYEE_VPA` in Vercel (authoritative) and `VITE_UPI_PAYEE_VPA` (displayed), then redeploy |

---

## Changing the brand

Everything is centralised in `src/config/brand.ts`: name, tagline, support
email, price, currency, UPI ID, page size, and the payment-unlock switch.
Changing the admin email or the price means updating `src/config/brand.ts` (or
the matching `VITE_` variable) and `firestore.rules` together, then redeploying
both the app and the rules. Colours are CSS variables in
`src/styles/index.css`. Icons regenerate with `npm run icons`
after editing the gradient in `scripts/generate-icons.mjs`.
