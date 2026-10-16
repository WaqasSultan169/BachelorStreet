# Bachelor Street Café — Implementation Plan

Incremental, verifiable phases. Each phase ends with:

```bash
npm run typecheck && npm run lint && npm run build
```

plus an explicit manual smoke test. We never claim production-readiness from a green build.

---

## Phase 1 — Foundation & architecture ✅ (this repository state)

Goals: reproducible foundation, no fake functionality.

- Next.js 16 App Router + TS strict + Tailwind v4 + ESLint.
- Core deps installed (mongoose, next-auth@beta, RTK, socket.io, zod, RHF, nodemailer, motion). Passwords now use `@node-rs/argon2` (Argon2id); the initial `bcryptjs` dependency has been removed.
- `ARCHITECTURE.md`, `SECURITY.md`, `IMPLEMENTATION_PLAN.md`, `.env.example`.
- Design tokens (charcoal/cream/tomato/gold), fonts, UI primitives.
- Mongoose connection singleton + initial models, error hierarchy, API envelope + centralized error mapping.
- Auth.js plumbing (edge-safe config + full instance, JWT, roles), login/register screens.
- Redux store (cart + location) with localStorage persistence.
- Storefront shell: home, menu (DB-backed), about, contact; loading/empty/error/not-found.
- Proxy gate for protected prefixes.

Smoke test: `npm run dev`, open `/`, `/menu`, `/login`, `/register`, walk nav, force an unknown route → styled not-found.

## Phase 2A — Premium restaurant storefront ✅ (current repository state)

Customer-facing experience, server-verified, no fake functionality.

- Product customization model (`optionGroups`, `isFeatured`, `popularity`, indexes).
- Public read APIs: `GET /api/products` (search/filter/sort/paginate), `GET /api/categories`; authoritative `POST /api/cart/quote`.
- `menu.service` (`getStorefront`, `listProducts`, `getCategories`, `getProductBySlug`) and `cart.service` (`quoteCart`).
- Redux cart rewrite (line items with options/notes, selectors), UI + toast slices, persisted store.
- Home page (hero, category grid, product rails, promo, story, testimonials), DB-backed menu browser (search/filter/sort/pagination), product customization dialog, cart drawer, `/checkout` review page (server-recalculated totals, clearly labeled demo boundary).
- Seeding via `npm run seed` (destructive, labeled demo data, refuses production without `--force`).

Smoke: `npm run build` + `next start`; `/`, `/menu`, `/about`, `/contact`, `/login`, `/register`, `/checkout` → 200; unknown → 404; `/api/health` 200. DB-backed reads return a clean 500 envelope / graceful fallback until `MONGODB_URI` is configured.

## Phase 2B — Catalog admin API, email, rate limiting (in progress)

- Whole-resource CRUD for `/api/categories`, `/api/products`, `/api/branches`, `/api/delivery-zones` (admin-gated writes).
- Register → welcome email; password reset flow (token email + reset form).
- Rate limiting on auth + order endpoints.
- Headers/CSP pass; `npm audit` re-check.

Smoke: admin creates category+product; menu reflects it immediately; guest/reset email arrive in a test inbox.

## Phase 3A — Fulfillment, branches & delivery zones ✅ (this repository state)

- First-visit modal (accessible dialog, focus management) to choose pickup or delivery; re-opened from the header control, cart drawer and checkout. Returning customers with a valid stored preference are not re-prompted.
- Pickup: active branches from MongoDB with name, address, today's opening state and a real Google Maps directions link; branch must be chosen explicitly (only auto-selected when a single branch exists). "Use my current location" runs on click only, with feedback when denied, and suggests the nearest branch without choosing it.
- Delivery: server-side geocoding (pluggable provider; clearly-labelled demo fallback when no key), current-location lookup, saved address + instructions, and a **server-computed** straight-line distance from the configured delivery origin with a 5 km radius. Out-of-zone addresses are explained; a typed area name is never assumed deliverable.
- State in Redux Toolkit (fulfilment type, branch, address, coordinates, lookup/coverage status) with non-sensitive preferences persisted and safely rehydrated; no tokens/secrets in `localStorage`.
- Checkout re-verifies coverage against `/api/delivery/check` and lets the customer edit address/contact; `checkCoverage()` is the single source of truth reused by order creation in Phase 4.
- New routes: `GET /api/branches`, `POST /api/delivery/check`, `GET /api/geo/search`, `GET /api/geo/reverse`. Env: `DELIVERY_*`, `GEOCODING_*` (documented in `.env.example`).

Smoke: `npm run build` + `next start`; configure `MONGODB_URI` and `npm run seed` (H-13 demo branch), then verify `/api/branches`, `/api/delivery/check`, `/api/geo/search`, `/api/geo/reverse` and the full pickup/delivery selection at `/checkout`. Without `MONGODB_URI`, branch-backed routes return a clean 500 envelope and the modal shows its honest error/retry state.

## Phase 3B — Cart sync, order creation & payment stub (in progress)

- Redux cart → server-side draft sync; order creation transaction reusing `checkCoverage()` and server-recalculated totals.
- Checkout flow reachable behind auth; payment method stub clearly labeled **demo** (no real gateway).

Smoke: add items, switch branches/zones, place order (requires Mongo), order row created.

## Phase 4A — Authentication, Google Sign-In & Account Security ✅ (this repository state)

- **Roles aligned:** `customer`, `admin`, `delivery_boy` (courier → delivery partner throughout the order model, socket events, and proxy prefixes).
- **Passwords:** Argon2id via `@node-rs/argon2` (OWASP baseline params, transparent rehash-on-login). Length-first policy (12–128) with a curated breach blocklist (leet/sequence/run detection) and name/email checks; shared client/server strength meter.
- **Email verification:** credential accounts start unverified and cannot sign in until verified. 256-bit tokens stored as SHA-256 hashes, single-use, 24 h; resend supported.
- **Password reset:** 256-bit hashed, single-use, 1 h tokens; reset revokes all sessions (`tokenVersion`).
- **Google sign-in:** creates a verified customer; **never auto-links** onto an existing password account (must sign in with the password first).
- **Session security:** server guards revalidate `isActive` + `tokenVersion` per request; logout clears the JWT.
- **Rate limiting:** in-process sliding window on login/register/verify/reset/change-password (documented Redis upgrade path).
- **Account area:** `/account` (profile, change password, saved addresses, connected sign-in methods); new `/verify-email`, `/forgot-password`, `/reset-password` screens; login error mapping; checkout prefills verified name/email (contact editable for the order only).
- New files: `src/lib/password-policy.ts`, `src/server/auth/password.ts`, `src/server/auth/tokens.ts`, `src/server/services/auth.service.ts`, `src/server/rate-limit.ts`, `src/server/db/models/authToken.model.ts`, `docs/AUTH.md`; extended `user.service`, `validation/auth`, `actions/auth`, `actions/account`, Auth.js callbacks, User model.

Smoke: `npm run typecheck && npm run lint && npm run build`; with `MONGODB_URI` set, register → verify → sign in, Google sign-in, forgot/reset (and confirm old sessions are revoked), protected URL redirect, unauthorized API → 401. Without Mongo, auth pages render and actions return a clean error.

## Phase 4B — Orders & tracking

- Order detail + history for customers; status timeline UI.
- Server starts Socket.IO (attach in custom/standalone server or same container).
- Live status updates `order:{id}` rooms.

Smoke: customer places order in tab A, admin flips status in tab B, tab A updates live.

## Phase 5 — Admin & courier dashboards

- Admin: catalog/branch/zone CRUD screens, order queue, assign courier.
- Courier: assigned deliveries, status transitions (pickup→delivered), guarded by role.

Smoke: admin assigns courier; courier advances state; customer sees the whole chain live.

## Phase 6 — Notifications, email polish, hardening

- In-app notifications (notification model) + Socket push; transactional email set (order confirm, status change, password reset).
- Load/empty/error audit across screens; a11y pass; `npm audit` review; performance inventory (images, bundle).

Smoke: full journey (guest → order → live updates → email trail) in one session.

## Phase 7 — Production hardening & deploy run-through

- Env/secret audit, headers/CSP verify, backups, instrumentation, docs for Docker/self-host.

Smoke: production build + start, health probe, all role journeys on a staging domain.

---

## Cross-cutting rules (apply every phase)

1. Server Components by default; `"use client"` only where needed.
2. All inputs validated with Zod; all server errors through the centralized mapper.
3. DB access only in `server/` — never from client components.
4. Role/ownership checks on every sensitive route and action — proxy is not a boundary.
5. No mock replacing real behavior without an explicit label (stub payment is labeled).
6. No placeholder links — a link must target a real route (typed routes enforce this).
7. Run typecheck + lint + build at each phase boundary; fix before advancing.