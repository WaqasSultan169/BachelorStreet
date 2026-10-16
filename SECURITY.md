# Bachelor Street Café — Security

Security model for the platform demo. This is a living document; revisit it on every phase.

---

## 1. Threat model (summary)

Public storefront, authenticated customers, staff/admin and courier access, orders containing PII (name, phone, address), and payment metadata. Key assets: customer PII, credentials, order integrity, and admin/courier privileges. Primary mitigations below.

## 2. Authentication

- **Auth.js v5 (JWT sessions).** No session rows to leak; the cookie is a signed JWT (`AUTH_SECRET`). Cookie: `httpOnly`, `sameSite=lax`, `secure` in production. Never expose `AUTH_SECRET`; rotate it in production and invalidate sessions on rotation.
- **Passwords:** hashed with **Argon2id** (`@node-rs/argon2`, m=19 MiB, t=2, p=1 — OWASP baseline). The hash string records its parameters, so they can be raised later and upgraded transparently on next successful login (`needsRehash`). Raw passwords are never stored or logged; comparisions use constant-work timing and a dummy verify when the account is absent.
- **Password policy:** length-first — minimum 12 / maximum 128 characters, plus a curated common/breached-password blocklist (with leet/sequence/run detection) and rejection of the user's own name/email. No forced character classes.
- **Email verification:** credential accounts must verify their email before they can sign in. Verification tokens are 256-bit CSPRNG values stored **only as SHA-256 hashes**, single-use, and time-boxed (24 h). Google accounts are treated as verified (Google asserts `email_verified`).
- **Password reset:** 256-bit hashed, single-use, 1 h tokens. A successful reset bumps the account's `tokenVersion`, revoking every existing session.
- **Session invalidation:** each JWT carries the `tokenVersion` it was issued with; server guards (`requireAuth`) revalidate it against the database, so deactivated/deleted accounts and stale sessions are rejected per request.
- **Google OAuth:** exchange happens server-side via Auth.js. **No auto-linking:** a Google email that collides with an existing password account is refused (`AccountNotLinked`) until the user signs in with that password — preventing an attacker-controlled provider account from taking over an existing login.
- **Account enumeration:** login/register responses use generic messages ("invalid credentials"); forgot-password and resend-verification always return a generic success message regardless of whether the account exists. Verification status is only revealed after the password has been checked.

## 3. Authorization matrix

| Action | customer | admin | delivery_boy |
| --- | :-: | :-: | :-: |
| Browse menu / place order / track own order | ✅ | ✅ | — |
| Create/reset own account | ✅ | ✅ | ✅ |
| Manage catalog (products, categories) | — | ✅ | — |
| Manage branches & delivery zones | — | ✅ | — |
| Manage all orders / assign delivery | — | ✅ | — |
| Delivery task list & status transitions | — | ✅ | ✅ |

Roles are `customer`, `admin`, `delivery_boy`. Public signup can only ever create a `customer` (the role is never caller-supplied); privileged roles are assigned by an admin via `setUserRole`, which also bumps `tokenVersion`.

**Enforcement points:** Proxy only gates protected prefixes (rough session check). Real authorization happens in Route Handlers / Server Actions / layouts via `requireAuth`/`requireRole(...)` and ownership checks (`order.user`). **Never trust the client** — the proxy is a convenience gate, not a security boundary (Next.js docs: verify auth per-request in code).

## 4. Input & output hardening

- **Validation:** Zod parses and rejects every request body/query/param before a handler touches the DB. Unexpected types never reach Mongoose (also mitigates NoSQL operator injection; Mongoose casts params as strings).
- **Error handling:** centralized mapper in `lib/api-response.ts`. Internal errors log server-side and return a generic `INTERNAL_SERVER_ERROR`; no stack traces or env details leak to clients.
- **Secrets:** all secrets live in `.env*` (git-ignored). `lib/env.ts` marks server-only via `server-only`; nothing secret is rendered. `passwordHash` is `select:false`.
- **Rate limiting:** in-process sliding window (`src/server/rate-limit.ts`) on login, register, verify-email, password-reset request/confirm, and change-password. Process-local for the demo; swap the `Map` for a shared store (Redis) in production — see the file's header comment.
- **Emails:** Nodemailer uses hardened defaults. Never use the `raw` option. All recipient addresses pass through validation.

## 5. Transport & headers

- Production served over **HTTPS** only; `AUTH_TRUST_HOST` explicitly set.
- Next.js default security headers (X-Content-Type-Options, Referrer-Policy worker/src) plus a **CSP** (`default-src 'self'; img-src 'self' data: https:; connect-src 'self' <socket origin>; style-src 'self' 'unsafe-inline'` — style unsafe-inline required by inline style properties; revisit when adopting nonce-based styling).
- CORS: socket handshakes restricted to `APP_URL` origin.
- Cookies: `secure` in prod, `httpOnly`, `sameSite=lax`.

## 6. Realtime (Socket.IO)

- Handshake authenticates with the session JWT; unauthenticated connections are rejected before joining rooms.
- Rooms are role/order-scoped (`user:{id}`, `role:{admin|delivery_boy}`, `order:{orderId}`). A delivery partner may only emit events for orders assigned to them; the server re-validates per emit.

## 7. Operations checklist (before any "production" label)

- [ ] `AUTH_SECRET` is a fresh high-entropy value in prod; `AUTH_GOOGLE_ID/SECRET` rotated if ever exposed.
- [ ] Google OAuth consent screen shows the correct app name; redirect URI is `{APP_URL}/api/auth/callback/google`.
- [ ] No default/admin account is ever seeded with a known password (`SEED_ADMIN_EMAIL` creates a password-less admin; first login goes through the reset flow).
- [ ] `MONGODB_URI` uses a least-privilege Atlas user and a restricted IP allow-list; no `?retryWrites=true` without auth.
- [ ] SMTP credentials stored as env; transport uses TLS.
- [ ] Logs redact emails/phones/tokens (logger has a redact list; audit on phase 2).
- [ ] HTTPS + HSTS terminates at the edge; headers verified.
- [ ] `npm audit` reviewed; known advisories (below) re-checked.
- [ ] Backups/point-in-time recovery enabled on Atlas.

## 8. Known dependency advisories (tracked)

| Advisory | Affects | Status / mitigation |
| --- | --- | --- |
| `braces` → `micromatch` → `fast-glob` (GHSA-vfj7-8cjw-p6xm) | dev-only ESLint toolchain | No runtime exposure. Upstream fix requires downgrading `eslint-config-next`; defer. Re-check each phase. |
| `nodemailer` families (addressparser DoS / SSRF via `raw` / punycode bypass etc.) | email transport | No upstream fix yet. We never use `raw`, validate recipients, disable URL/file access in content, and only send to validated addresses. Re-check on every major bump. |
| Audited at: foundation (see `npm audit` output). | — | — |