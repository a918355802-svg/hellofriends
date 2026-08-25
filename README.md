# Hellofriends — social discovery & voice-chat web app

A mobile-first social discovery MVP. Visitors enter instantly as anonymous
guests, browse partner profiles with live online status, and start a ₹99 payment
flow for a voice call, chat or video call. A separate admin dashboard manages
every profile without touching the code.

**Stack:** React 18 · Vite 6 · TypeScript · Tailwind CSS · Firebase
(Anonymous Auth, Firestore) · PWA · deployed on Vercel as a static site

Runs entirely on Firebase's **free Spark plan** — no billing account required.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in the Firebase web config
npm run dev                    # http://localhost:5173
```

Without a Firebase config the app shows a setup screen listing exactly which
variables are missing, instead of failing with a cryptic error.

Profiles are created in the dashboard — sign in at `/admin` and use
**Partners → Add partner**. There is no seed script and no service-account
credential to obtain: everything is written through the same Firestore rules
the app itself uses.

Admin access is one fixed email — see "Admin access" below.

Full setup — Firebase project, security rules, UPI, Vercel — is in
**[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## What is implemented

### Public app
- **No signup, no login.** Firebase Anonymous Auth creates a persistent guest
  account on the first visit and mirrors it into `users/{uid}`.
- **Discovery feed** from Firestore with real pagination, infinite scroll
  (IntersectionObserver), skeleton cards and lazy-loaded images.
- **Realtime status.** One listener on recently-updated partners patches
  Online/Offline, Featured and Active changes into the feed with no refresh.
- **Profile detail** with photo gallery, interests and a per-document realtime
  listener.
- **₹99 UPI payment flow** as a bottom sheet: offer → the phone's own UPI app
  list with ₹99 pre-filled → pending → success / failed. The app never draws its
  own list of UPI apps; the device shows what is really installed.
- **Safety:** report, block, community guidelines, safety tips, terms, privacy,
  refund policy, 18+ notice.
- **PWA:** manifest, icons, service worker, installable, offline shell.

### Admin dashboard (`/admin`)
- Email + password sign-in, restricted to one fixed email address.
- Live stats, availability breakdown and recent payments — the payment tiles
  and tables update themselves, with no reload.
- Payment review queue: confirm each UPI payment as received or not received.
  The payer's screen changes the instant you decide.
- Full partner CRUD: create, edit, delete, photo upload (compressed in-browser),
  Online/Offline, Active/Inactive, Featured, verified badge, sort priority.
- Live profile preview showing exactly what a visitor will see.
- Search by name, filters (status / visibility / featured), sorting, pagination.
- Payment records with status and date filters; anonymous user list.

---

## Two behaviours worth knowing about

**1. Payment does not unlock the interaction.** By design, tapping Call / Chat /
Video always reopens the ₹99 sheet — including right after a successful
payment. A payment buys one request, not ongoing access. Everything that
decides this sits in `src/components/partner/InteractionButtons.tsx`, which
calls `open()` unconditionally.

**2. The client never decides that a payment succeeded.** Returning from a UPI
app proves nothing — the app does not report the outcome back to the browser,
and there is no gateway to ask. Every payment is confirmed by the owner in
**Admin → Payments**, matched on the reference. See "Payment architecture".

---

## Project structure

```
src/
  config/                     brand.ts (branding, price), env.ts, firebase.ts
  types/                      Shared TypeScript models
  lib/                        cn, format, errors, upi, image
  services/                   auth, users, partners, payments, photos, reports
  hooks/                      useGuestSession, usePartnersFeed, useInfiniteScroll,
                              usePaymentFlow, useAdminAuth, useToast, useDebounce
  components/                 ui/ layout/ partner/ payment/
  pages/                      Home, Discover, Chats, Profile, PartnerDetail,
                              Legal, NotFound
  admin/                      Separate dashboard shell, guard, pages, components

firestore.rules               Security rules (the real access boundary)
firestore.indexes.json        Composite indexes the queries need
scripts/                      PWA icon generator
```

---

## Routes

| Public | Admin |
| --- | --- |
| `/` — home feed | `/admin/login` |
| `/discover` — search & filters | `/admin` — dashboard |
| `/profile/:id` — profile detail | `/admin/partners` |
| `/profile` — your guest account | `/admin/partners/new` |
| `/chats` — your requests | `/admin/partners/:id/edit` |
| `/legal/:slug` | `/admin/payments` · `/admin/users` · `/admin/settings` |

Everything is client-side routed — no full page reloads.

---

## Data model

```
partners/{id}     name, nameLower, age, gender, bio, interests[], photoUrl,
                  online, verified, featured, priority, active,
                  createdAt, updatedAt
partners/{id}/media/gallery   photos[]  (extra photos, loaded only on detail)

users/{uid}       uid, isAnonymous, createdAt, lastSeenAt, sessionCount,
                  paymentAttempts, successfulPayments, platform, language
users/{uid}/blocks/{profileId}

payments/{id}     userId, profileId, profileName, interactionType, amount,
                  currency, status, provider, transactionId, reference,
                  failureReason, reviewedBy, createdAt, updatedAt, verifiedAt

reports/{id}      reporterUid, profileId, reason, details, createdAt, resolved
```

Payment statuses: `initiated → pending → verified | failed | cancelled`.

---

## Photos without a paid plan

Firebase Storage requires the paid Blaze plan, so partner photos never touch it.
Instead the admin panel resizes and re-encodes each image **in the browser**
(WebP, longest edge 900px, quality stepped down until it fits ~110 KB) and
stores the result as a `data:` URL in Firestore, which the free Spark plan
covers.

Where the bytes live matters as much as their size:

| | Where | Why |
| --- | --- | --- |
| Main photo | inside `partners/{id}` | one feed read renders the card — no second request, no image flash |
| Extra photos | `partners/{id}/media/gallery` | their bytes never load with the feed; fetched only when someone opens the profile |

Both stay comfortably under Firestore's 1 MiB per-document cap. Measured on a
4000×3000 JPEG: 1.1 MB in, 83 KB out, under a second.

An admin who would rather host images elsewhere can paste an `https://` link
instead of uploading — the same field accepts both.

**The trade-off:** Firestore's free tier includes 10 GiB/month of egress. At
roughly 1 MB per feed page that is about 10,000 page loads a month before you
would need billing. Offline caching softens repeat visits. If you outgrow it,
switch `photoUrl` to a CDN link, or enable Storage on Blaze.

---

## Payment architecture

No gateway, and no backend. Every ₹99 is a direct UPI transfer to
**`8786546786@okhdfcbank`**.

```
Browser                                   User's UPI app        Owner
-------                                   --------------        -----
tap Call/Chat/Video
  └─ build upi://pay?pa=…&am=99.00&tr=HF…      (instant, local)
  └─ write payments/{id} = initiated           (background)

tap Pay ────────────────────────────────► phone's own UPI
                                           app list opens
                                           ₹99 pre-filled
                                           user pays ─────────► ₹99 lands
                                          (no callback exists)   in the bank

                                                          Admin → Payments
                                                          match the reference
                                                          press "Money received"
  ◄──── Firestore listener flips the screen to success ────────┘
```

Why there is no server: a UPI link needs only the payee VPA and the amount,
both public. Putting an API in front of that added a component that could fail —
and did — without adding anything the payment needed. The record is written
straight to Firestore instead, with the document id generated client-side so a
weak connection can never delay the redirect.

What the rules enforce, since anyone can write to Firestore from a browser:

- A payer may create a request only **for themselves**, only at the **real
  price** (pinned in the rules), and only in the `initiated` state.
- A payer may then move it to `pending` ("I opened a UPI app") or `cancelled`,
  and nothing else — never the amount, never the owner, never a verdict.
- Only the **admin email** can mark a payment `verified` or `failed`.

### The honest limitation

UPI gives a website no callback. A user returning from their UPI app looks
exactly the same whether they paid or pressed back, and nothing in a browser can
tell the difference. So:

- Nothing is ever marked Verified automatically.
- The user sees a truthful "Payment pending" screen with a reference to quote.
- The owner matches that reference against the credit in their bank and
  confirms it; the user's open screen updates instantly through a Firestore
  listener.

The record is a claim, not proof. The bank statement is the proof.

## Security

- Admin access = one fixed email address, compared against the email inside the
  verified Firebase ID token. There is no allowlist and no role system, so no
  user can grant themselves access. Hiding `/admin` is **not** the boundary —
  `firestore.rules` is. Someone who forces their way to the route gets a
  dashboard whose every query is denied.
- There are no secrets to leak: the app has no backend and no gateway keys.
  Everything shipped is public by design, and access is decided by
  `firestore.rules`, not by hiding configuration.
- Guests cannot write to `partners`, cannot write to `payments`, cannot read
  other users' documents, and cannot inflate their own payment counters.
- Photo writes are admin-only, and images are re-encoded in the browser before
  they are stored, so no original file bytes are ever written verbatim.

---

## Performance notes

- Route-level code splitting; the admin bundle never reaches a normal visitor.
- Manual chunks split React, the router and Firebase so app updates do not
  invalidate the vendor cache.
- Firestore offline persistence cuts repeat reads on revisits.
- Page-at-a-time queries (`pageSize + 1` to detect the next page without an
  extra round trip).
- One shared realtime listener for the whole feed instead of one per card.
- `PartnerCard` is memoised; images are lazy with `decoding="async"`.
- Service worker: network-first for navigations, cache-first for hashed assets,
  stale-while-revalidate for images (capped at 60 entries).

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript across the app and config |
| `npm run icons` | Regenerate PWA icons and the OG cover |

---

## Before you go live

- [ ] Add your profiles in Admin → Partners, using photos you have the rights to use.
- [ ] Deploy `firestore.rules`.
- [ ] Deploy `firestore.indexes.json`.
- [ ] Confirm `8786546786@okhdfcbank` is the correct receiving UPI ID.
- [ ] Agree who checks the pending payments queue, and how often.
- [ ] Replace `hellofriends-theta.vercel.app` in `index.html`, `public/robots.txt` and
      `public/sitemap.xml` with your real domain.
- [ ] Set a real support email in `src/config/brand.ts`.
- [ ] Have the legal pages in `src/pages/LegalPage.tsx` reviewed — they are
      reasonable drafts, not legal advice.
- [ ] Confirm your payment provider permits your use case before taking money.
