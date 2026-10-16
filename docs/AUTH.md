# Authentication

How auth works in Bachelor Street Café, and what you must configure to run it.

Auth is built on **Auth.js v5 (`next-auth@5`)** with **JWT sessions** and MongoDB (Mongoose) for user data. Credential (email + password) sign-in uses **Argon2id**; Google is the only OAuth provider.

---

## 1. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | ✅ | Signs session JWTs. 32+ random bytes. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Rotating it logs everyone out. |
| `APP_URL` | ✅ | Public base URL. Used to build verification/reset links. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | Required only to enable Google sign-in. |
| `AUTH_TRUST_HOST` | prod | Set `true` behind a reverse proxy / non-localhost host. |
| `MONGODB_URI` | ✅ | Users, auth tokens and sessions (JWT) all depend on it.
| `SMTP_*`, `EMAIL_FROM` | for email | Without SMTP, verification/reset emails are logged and dropped (flows still work, no error). |

See `.env.example` for the full list. All values are validated in `src/lib/env.ts`.

## 2. Google OAuth setup

1. **Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. Add each app origin under **Authorized JavaScript origins** (scheme and host only, no path), for example `http://localhost:3000` for local development and `https://your-production-domain` for production.
3. Add the matching callback under **Authorized redirect URIs**: `{APP_URL}/api/auth/callback/google` (for example `http://localhost:3000/api/auth/callback/google`).
4. Configure the OAuth consent screen (External). During testing add your own email under **Test users**.
5. Copy the client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Callbacks and tokens are handled entirely server-side by Auth.js; the app only sees the returned profile.

## 3. Flows

- **Register (email/password):** creates an **unverified** `customer`, emails a verification link (24 h, single-use, stored as a SHA-256 hash), and does **not** sign the user in.
- **Verify email:** `/verify-email?token=…` marks the account verified. Resend is available on the same page.
- **Sign in (email/password):** only verified accounts may sign in. Failures are generic to avoid enumeration; "unverified" is only surfaced after the password is correct.
- **Google sign-in:** creates a verified `customer` for a new email. If the email belongs to an existing **password** account, sign-in is refused — sign in with the password first (no auto-linking).
- **Forgot/reset password:** `/forgot-password` always returns a generic success. Reset links (1 h, single-use) land on `/reset-password?token=…`; a successful reset revokes all existing sessions (`tokenVersion` bump).
- **Session validity:** every request through `requireAuth`/`requireRole` re-checks the account is active and the JWT's `tokenVersion` matches the database, so deactivation, deletion, and password resets invalidate live sessions.

## 4. Password policy

Length-first: 12–128 characters, rejected if it is a known-common/breached password (including leet/sequence/repeat mutations) or contains the user's own name/email. There are **no** forced character classes. Strength feedback is provided client-side (`src/lib/password-policy.ts`, shared with the server Zod schemas).

## 5. Where things live

| Concern | File |
| --- | --- |
| Auth.js config (edge-safe) | `src/auth.config.ts` |
| Auth.js instance (providers, callbacks) | `src/auth.ts` |
| Password hashing (Argon2id) | `src/server/auth/password.ts` |
| Password policy / strength | `src/lib/password-policy.ts` |
| Token generation/hash | `src/server/auth/tokens.ts` |
| Auth logic (register/verify/reset/Google/session) | `src/server/services/auth.service.ts` |
| User CRUD/profile/addresses | `src/server/services/user.service.ts` |
| Server actions | `src/server/actions/auth.ts`, `src/server/actions/account.ts` |
| Validation schemas | `src/server/validation/auth.ts` |
| Rate limiting | `src/server/rate-limit.ts` |
| Guards | `src/server/middleware/require-auth.ts`, `src/proxy.ts` |

## 6. Testing checklist

- [ ] Google sign-in (new + returning user)
- [ ] Credential sign-in with a valid password
- [ ] Invalid password → generic error
- [ ] Unverified account → blocked with an actionable message
- [ ] Expired/used reset token → rejected
- [ ] Logout clears the session
- [ ] Protected URL while signed out → redirected to `/login`
- [ ] Unauthorized API call → 401 envelope
- [ ] Password reset revokes existing sessions

## 7. Production notes

- Run behind **HTTPS** and set `AUTH_TRUST_HOST=true`.
- Replace the in-process rate limiter with a shared store (e.g. Redis) for multi-instance deployments.
- Never seed a production admin with a known password; `SEED_ADMIN_EMAIL` creates a password-less admin whose access is established via the password-reset flow.
