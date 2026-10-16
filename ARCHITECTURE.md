# Bachelor Street Café — Architecture

Production-oriented restaurant ordering platform demo for **Bachelor Street Café, Islamabad**. Inspired by the ordering experience of chickfillet.com.pk; built with an original design, palette and layout — no third-party brand assets are reproduced.

This document is the source of truth for how the system is organised. It is updated as the implementation evolves.

---

## 1. Goals

- A premium, conversion-focused storefront (menu browsing, cart, checkout, order tracking).
- Role-based flows: **customer**, **admin**, **courier (delivery personnel)** and **staff**.
- Real-time order updates via Socket.IO (authenticated).
- Transactional email via Nodemailer.
- Type-safe end to end: TypeScript strict, Zod validation, typed Mongoose models.
- Server Components by default; client components only where interactivity is required.
- All database access stays on the server; the client talks REST, never touches Mongo.

## 2. Technology stack (as implemented)

| Concern | Choice | Version installed |
| --- | --- | --- |
| Framework | Next.js (App Router, Turbopack) | 16.4.0 |
| UI runtime | React | 19.3.0 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 (`@theme` tokens) | ^4 |
| Motion | `motion` (Framer-Motion-compatible API, `motion/react`) | 14.1.0 |
| Database | MongoDB Atlas + Mongoose | 9.11.1 |
| Auth | Auth.js v5 (`next-auth@beta`) — JWT sessions, Google OAuth + credentials | 5.0.0-beta.32 |
| Client state | Redux Toolkit + React Redux | 2.13.0 / latest |
| Realtime | Socket.IO (server) + socket.io-client | 4.8.4 |
| Validation | Zod v4 + React Hook Form (@hookform/resolvers) | 4.6.6 / 7.90.0 |
| Email | Nodemailer | 8.0.11 |
| Misc | `@node-rs/argon2`, `clsx`, `tailwind-merge`, `lucide-react`, `server-only` | — |

> **Auth.js note.** `next-auth@beta` (Auth.js v5) remains the de-facto stable release for the App Router and is what we use. Session strategy is **JWT** (stateless); account records and user profiles live in our own Mongo collections managed by Mongoose. We deliberately do **not** use `@auth/mongodb-adapter` so that one collection (`users`) is owned by a single code path and custom fields (role, phone, addresses) are trivial.

> **Audit notes.** `npm audit` reports (a) `braces`/`micromatch`/`fast-glob` via the ESLint toolchain (dev-only, fix requires breaking downgrade of `eslint-config-next`) and (b) a family of `nodemailer` advisories with **no upstream fix yet** (we use defaults, never the `raw` option, and validate all recipients). Tracked in SECURITY.md §8.

## 3. Next.js 16 specifics we respect

This repo uses Next.js 16 which has deliberate breaking changes. The version-matched docs live in `node_modules/next/dist/docs/`. Key rules:

- **`proxy.ts` replaces `middleware.ts`.** The Proxy function export must be named `proxy` (or default). Proxy runs on the **Node.js** runtime; the `runtime` config export is not allowed there.
- **Request APIs are async.** `cookies()`, `headers()`, `params` and `searchParams` must be awaited. Route handlers use `ctx: RouteContext<'/path'>` and `await ctx.params`.
- **`next lint` is removed.** Lint via the ESLint CLI (`npm run lint`).
- **Turbopack is the default** for `dev` and `build`.
- **Typed routes are on.** Next.js generates route types; `<Link href>` values are checked against existing routes at build/typecheck time. Never link to a route that does not exist.
- Image optimization defaults changed (domain config removed, qualities default `[75]`, local-IP restriction).

## 4. Folder structure

```
.
├── ARCHITECTURE.md / SECURITY.md / IMPLEMENTATION_PLAN.md / .env.example
├── next.config.ts            # Turbopack, serverExternalPackages, images
├── src/
│   ├── proxy.ts              # Auth gate / session handling (was middleware.ts)
│   ├── auth.config.ts        # Edge-safe Auth.js config (providers, pages, session)
│   ├── auth.ts               # Full NextAuth instance (DB-backed callbacks)
│   ├── app/                  # App Router
│   │   ├── layout.tsx        # Root layout: fonts, tokens, header/footer
│   │   ├── page.tsx          # Storefront home (server component)
│   │   ├── menu/ about/ contact/ login/ register/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts   # Auth.js handlers
│   │   │   ├── health/route.ts               # Liveness probe
│   │   │   └── <domain>/...                  # Feature REST routes (phases 2+)
│   │   ├── not-found.tsx error.tsx global-error.tsx loading.tsx
│   │   └── globals.css       # Tailwind v4 @theme design tokens
│   ├── components/
│   │   ├── ui/               # Button, Input, Card, Badge, Skeleton, EmptyState…
│   │   ├── layout/           # Header, Footer, Brand
│   │   └── (feature dirs in later phases)
│   ├── hooks/                # Shared client hooks (useMediaQuery, useSocket…)
│   ├── lib/                  # Server-safe + shared helpers
│   │   ├── api-response.ts   # Envelope helpers + centralized error mapping
│   │   ├── constants.ts      # Roles, order statuses, currency, pagination
│   │   ├── env.ts            # Server env schema (Zod) + accessor
│   │   ├── client-env.ts     # NEXT_PUBLIC_* accessor
│   │   ├── errors.ts         # AppError hierarchy
│   │   ├── logger.ts         # Leveled, safe logger
│   │   ├── utils.ts          # cn(), formatPkr(), slugify(), safeParseJson()
│   │   └── socket/events.ts  # Socket.IO event names + payload types
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts      # Mongoose connection singleton
│   │   │   └── models/       # user, category, product, branch, deliveryZone,
│   │   │                     #   cart, order, notification
│   │   ├── auth/             # Password hashing, role guards
│   │   ├── services/         # user, menu, email (+ socket in realtime phase)
│   │   ├── validation/       # Zod schemas: auth, common (pagination, ids…)
│   │   └── middleware/       # requireAuth / requireRole for route handlers
│   ├── store/                # Redux: store, provider, cart + location slices
│   └── types/                # Domain types + next-auth.d.ts (session augment)
└── public/                    # Static assets
```

## 5. Module map

| Module | Where it lives (planned) | Responsibility |
| --- | --- | --- |
| Public storefront | `app/page.tsx`, `app/menu/*` | Marketing home, catalog browsing, empty/loading/error states |
| Auth & profiles | `auth.ts`, `auth.config.ts`, `app/login|register`, `server/services/user.service.ts` | Google OAuth + credentials, password hashing, session, role |
| Cart & checkout | `store/slices/cartSlice.ts`, `app/checkout/*` (phase 3) | Client cart state + location state; server-side cart sync on checkout |
| Orders & tracking | `server/db/models/order.model.ts`, `app/account/orders/*` (phase 4) | Order creation, status machine, history, live tracking |
| Admin dashboard | `app/admin/*` (phase 5) | Catalog CRUD, orders, branches, delivery zones, reporting |
| Courier dashboard | `app/courier/*` (phase 5) | Assigned deliveries, status transitions |
| Catalog | `server/db/models/{category,product,branch,deliveryZone}*`, `server/services/menu.service.ts` | Products, categories, branches, delivery zones |
| Email & notifications | `server/services/email/*`, `server/db/models/notification.model.ts` | Transactional mail (order confirm, password reset), in-app notifications |
| Realtime | `lib/socket/events.ts`, `server/services/socket/*` (phase 6) | Socket.IO server + authenticated client updates |
| Data & validation | `server/db/*`, `server/validation/*` | Mongoose models, Zod schemas, API input parsing |

## 6. Data layer

Mongoose connection is a cached singleton (`server/db/index.ts`). One model per file, with a plain TypeScript interface exported alongside for safe typing. Fields are conservative; indexes are declared in-schema.

| Model | Purpose | Key fields |
| --- | --- | --- |
| `User` | Customer / staff / admin / courier | email (unique, normalized), passwordHash (select:false), name, phone, role, addresses[], isActive, lastLoginAt |
| `Category` | Menu grouping | name, slug (unique), description, image, sortOrder, isActive |
| `Product` | Menu item | name, slug, description, price, compareAtPrice, category, images[], isActive, isAvailable |
| `Branch` | Physical outlet | name, slug, address, phone, coordinates, deliveryAvailable, pickupAvailable, isActive |
| `DeliveryZone` | Fee/ETA rules per branch | branch, areas[], deliveryFee, freeAbove, minOrder, etaMinutes, isActive |
| `Cart` | Server-side order draft (checkout) | user (or guestId), items[], totals, currency |
| `Order` | Transaction | orderNumber (unique), user, items[], subtotal/fees/total, branch, deliveryZone, deliveryAddress, payment, status + statusHistory[], courier |
| `Notification` | In-app alerts | recipient, type, title, body, payload, readAt |

**Status machines** (see `lib/constants.ts`):

- Order: `pending → confirmed → preparing → ready → out-for-delivery → delivered` (+ `cancelled`); pickup omits delivery legs.
- Payment: `pending → paid | failed | refunded`.

## 7. API conventions

REST, and every response uses the envelope below. Handlers are wrapped by the central `withApiHandler` helper so that **all errors funnel through one mapper** (`lib/api-response.ts` → `lib/errors.ts`).

```ts
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 12 } }

// failure (AppError or unexpected → 500, logged server-side)
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "...", "details": [...] } }
```

Rules:

- `GET` collection endpoints accept `?page=&pageSize=` (validated by `paginationSchema`).
- Update/create endpoints validate with Zod; failures are `400 VALIDATION_ERROR` mapping field issues from `schema.safeParse`.
- Authenticated endpoints read the session with `auth()` and call `requireRole(...)` — authorization is **never** decided client-side or in the proxy alone.
- No secrets are ever returned; passwordHash is `select:false`.
- Health probe: `GET /api/health`.

## 8. Authentication & authorization

- **Auth.js v5, JWT strategy.** `auth.config.ts` is edge-safe (pages, session config, Google provider — registered only when `AUTH_GOOGLE_ID/SECRET` are set); `auth.ts` adds the Credentials provider and DB-backed `jwt`/`session` callbacks that attach `id`, `role` and `tokenVersion`.
- Passwords are hashed with **Argon2id** (`@node-rs/argon2`); credentials are compared against the `users` collection only, with hashes re-encoded on login when parameters change.
- Email verification, password reset and Google sign-in are handled in `auth.service.ts`; single-use tokens are stored as SHA-256 hashes. `tokenVersion` invalidates live JWT sessions on password reset / role change.
- Session is available to Server Components via `await auth()` and to route handlers via the same helper; guards revalidate the account per request (`requireAuth`).
- **Guard layers:** Proxy (login gate for protected path prefixes) → route/layout checks with `requireRole`. Server Actions and Route Handlers always re-verify.
- Roles: `customer | admin | delivery_boy`. Public signup can only create a `customer`.

## 9. Realtime (Socket.IO) — design

- A small standalone server (or the same container) runs `socket.io`. The Next app and Socket.IO server share a namespace.
- Handshake authenticates using the Auth.js **session JWT** sent as a token; rooms are derived from roles and the affected order ids.
- Event names/payload contracts live in `lib/socket/events.ts` and are reused by server and client so updates stay type-safe:
  - `order:created`, `order:status-changed`, `order:assigned`, `notify:user`.
- Customers are notified in room `user:{id}`; couriers/admins join `role:{admin|courier}` plus per-order rooms.

## 10. Client state

Redux Toolkit store (`store/`):
- `cartSlice` — items (productId, qty, unitPrice, name, image snapshot), add/remove/updateQty/clear, persisted to `localStorage`.
- `locationSlice` — selected branch, delivery mode (delivery/pickup), area/address used at checkout.
- Typed hooks `useAppDispatch` / `useAppSelector`; selectors compute totals.

## 11. Frontend conventions & design system

- Server Components default; add `"use client"` only for interactivity (forms, cart, motion reveals, mobile menu).
- Design tokens defined in `globals.css` via Tailwind v4 `@theme` (charcoal/cream/tomato/gold palette), custom shadows; utilities use `cn()`.
- Typography: `Fraunces` (display) + `Manrope` (body) via `next/font`.
- UI primitives in `components/ui/` are accessible (focus-visible rings, labels, aria attributes, loading states).
- Every data screen provides **loading** (Suspense `loading.tsx`), **empty**, and **error** states plus a global `error.tsx` / `not-found.tsx`.

## 12. Environments & variables

See `.env.example`. Server-only values are read via `lib/env.ts` (never exported to client). Client-visible values must be prefixed `NEXT_PUBLIC_` and read through `lib/client-env.ts`.

## 13. Verification workflow

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # ESLint CLI
npm run build       # next build (Turbopack)
npm run dev         # local dev
```

Every phase in IMPLEMENTATION_PLAN.md ends with these three commands passing and a manual smoke test before moving on.