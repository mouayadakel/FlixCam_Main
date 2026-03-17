# FlixCam.rent – Sign In & Log In Report

**Scope:** Auth popup (modal) and separate Login/Register pages.  
**Date:** March 17, 2026.

---

## 1. Executive Summary

The app exposes authentication in two ways:

| Entry point | Type | Where used |
|-------------|------|------------|
| **Auth popup (modal)** | Dialog with Login / Register / OTP tabs | Public site header & mobile nav when user is not signed in |
| **Separate pages** | Full-page `/login` and `/register` | Direct URLs, links from forgot-password, and fallback when modal provider is not available |

Both flows share the same backend: NextAuth (Credentials + Google + Phone OTP), `/api/auth/register`, and `/api/auth/verify-phone`. Validation uses shared Zod schemas from `@/lib/validators/auth.validator`.

---

## 2. Auth Popup (Modal)

### 2.1 Where It Lives

- **Provider:** `src/components/auth/auth-modal-provider.tsx`  
  - Context: `isOpen`, `tab` (`'register' | 'login' | 'otp'`), `openAuthModal(tab?)`, `closeAuthModal()`, `setTab(tab)`.
- **Modal UI:** `src/components/auth/auth-modal.tsx`  
  - Single `Dialog` with tabbed content: Register, Login, OTP (phone verification).
- **Mount:** Only under the **public** layout.  
  - `src/app/(public)/layout.tsx` → `PublicLayoutClient`  
  - `src/components/public/public-layout-client.tsx` wraps content in `AuthModalProvider` and renders `<AuthModal />`.

So the popup is only available on routes that use the public layout (e.g. `/`, `/equipment/*`, etc.). It is **not** mounted in auth routes (`/login`, `/register`) or portal/admin layouts.

### 2.2 How It’s Triggered

- **Header:** `src/components/public/public-header.tsx`  
  - If `useAuthModalOptional()` returns a value (i.e. inside `AuthModalProvider`):  
    - “Login” → `authModal.openAuthModal('login')`  
    - “Register” → `authModal.openAuthModal('register')`  
  - If not (e.g. outside public layout):  
    - Login/Register are normal links to `/login` and `/register` with optional `callbackUrl`.
- **Mobile nav:** `src/components/public/mobile-nav.tsx`  
  - Uses `useAuthModal()` and calls `openAuthModal('login')` / `openAuthModal('register')` for auth actions.

### 2.3 Modal Tabs & Behaviour

1. **Register tab**
   - Fields: Name (optional), Email, Phone (Saudi, `PhoneInput`), Password, Confirm password.
   - Submit → `POST /api/auth/register` with `email`, `password`, `name`, `phoneNumber`.
   - If response has `requireOtp: true`: switch to **OTP** tab, show 6-digit input; `POST /api/auth/verify-phone` with `userId` + `otpCode`, then `signIn('phone-otp', { oneTimeToken })` and close modal + refresh.
   - If no OTP: `signIn('credentials', ...)`; on success, close modal and refresh; on error, toast and switch to Login tab.
   - “Already have an account?” → switch to Login tab.

2. **Login tab**
   - Fields: Email (label “Username”), Password, “Keep Me Signed In” checkbox, “Forgot Password?” link to `/forgot-password` (and `closeAuthModal()`).
   - Submit → `signIn('credentials', { email, password, redirect: false })`. On success: close modal and `router.refresh()`; on error: toast (e.g. “Email or password is incorrect”).
   - Social: Google wired (`signIn('google', { callbackUrl })`). Facebook and Twitter buttons are present but **not wired** (no handlers).
   - “Don’t have an account?” → switch to Register tab.

3. **OTP tab**
   - Shown after register when `requireOtp` is true. 6-digit OTP input; submit → verify-phone API then `signIn('phone-otp', ...)`.
   - Resend: currently shows “Not implemented” toast; no real resend endpoint used.
   - Modal is intentionally not closeable on this tab (`handleOpenChange`: if `!open && tab !== 'otp'` then `closeAuthModal()`).

### 2.4 Validation & Copy

- **Validation:** `loginSchema` and `registerFormSchema` from `@/lib/validators/auth.validator` (Zod), via `react-hook-form` + `zodResolver`.
- **Copy:** Inline `translations` object in `auth-modal.tsx` for `ar` and `en`; `useLocale()` used for RTL and locale. OTP/resend strings are partly hardcoded English.

### 2.5 UX / Security Notes (Popup)

- Blurred overlay: `overlayClassName="bg-black/50 backdrop-blur-md"`.
- Dialog has `DialogTitle` with `sr-only` for accessibility.
- Forgot password link closes the modal and navigates to `/forgot-password`.
- No `callbackUrl` handling in the modal: after login it only does `router.refresh()` and does not redirect to a prior page or role-based destination (unlike the full login page).

---

## 3. Separate Login Page (`/login`)

- **File:** `src/app/(auth)/login/page.tsx`  
- **Layout:** Full-page, centered card; RTL/LTR via local `language` state (`ar` | `en`); language toggle in header.

### 3.1 Behaviour

- **Form:** Email, Password. Same `loginSchema` and `signIn('credentials', ...)`.
- **URL handling:**
  - Removes `password` from URL if present (security).
  - Reads `error` and shows toast (Configuration, CredentialsSignin, VendorAccessDenied, Default).
  - Pre-fills `email` from `?email=`.
- **On success:**
  - Uses `callbackUrl` from query if valid (same-origin, not an auth page).
  - Else uses `document.referrer` (same-origin, not auth page).
  - Else role-based: `DATA_ENTRY` → `/portal/dashboard`, `VENDOR` → `/vendor/dashboard`, else `/admin/dashboard`.
  - Redirect via `window.location.href` so the next request sends the session cookie.
- **Links:** Forgot password → `/forgot-password`; “Sign Up” → `/register`.

### 3.2 Copy

- Page uses both a local `translations` object (ar/en) and `useLocale()` for error toasts (e.g. `i18n('auth.loginError')`).

---

## 4. Separate Register Page (`/register`)

- **File:** `src/app/(auth)/register/page.tsx`  
- **Layout:** Full-page, two “tabs” in state: `'register'` and `'otp'` (no URL change).

### 4.1 Behaviour

- **Register form:** Name (optional), Email, Phone (Saudi `PhoneInput`), Password, Confirm password. Same `registerFormSchema` and `POST /api/auth/register`.
- **After register:**
  - If `requireOtp`: switch to OTP view, 6-digit input; `POST /api/auth/verify-phone` then `signIn('phone-otp', ...)`; on success `router.push('/dashboard')` (hardcoded; no role-based or `callbackUrl`).
  - If no OTP: `signIn('credentials', ...)`; on error redirect to `/login?email=...`; on success redirect to `callbackUrl` or `/portal/dashboard`.
- **Resend OTP:** Toasts “Not implemented” / “Resend logic requires dedicated endpoint.”
- **Footer:** “Already have an account?” → `/login`.

### 4.2 Bug: Missing `useEffect` Import

- The page uses `useEffect` for the OTP resend countdown (lines 46–51) but only imports `useState` from `'react'`. This will cause a runtime error. **Fix:** add `useEffect` to the React import in `src/app/(auth)/register/page.tsx`.

---

## 5. Backend & Auth Config

### 5.1 NextAuth (`src/lib/auth/config.ts`)

- **Providers:**  
  - **Credentials:** email + password; rate limit (Upstash), login attempts and lockout (5 failures → 15 min lock), validation via `loginSchema`.  
  - **Google:** optional (env); no dangerous email linking.  
  - **Phone OTP:** provider id `phone-otp`; consumes `oneTimeToken` from cache; deletes token after use.
- **Pages:** `signIn: '/login'`, `error: '/login'`.
- **Session:** JWT, 24h max age, 30 min update age; secure cookie in production.

### 5.2 Register API (`POST /api/auth/register`)

- Validates body with `deferredRegisterSchema` (email, password, name, phoneNumber).
- Rate limit (Upstash).
- Creates user (bcrypt password, `phoneVerified: false`, role `DATA_ENTRY`, status `PENDING`).
- Creates `PhoneVerification` with hashed 6-digit OTP, 10 min expiry.
- Sends SMS via Twilio when configured; else logs mock OTP in dev.
- Response: `{ requireOtp: true, user: { id, phone } }`. No automatic sign-in; client must complete OTP then `signIn('phone-otp', ...)`.

### 5.3 Verify-phone API

- Used by both modal and register page: `POST /api/auth/verify-phone` with `userId`, `otpCode`. Validates OTP, then stores one-time token in cache and returns it; client calls `signIn('phone-otp', { oneTimeToken })`.

---

## 6. Differences: Popup vs Separate Pages

| Aspect | Auth popup (modal) | Login page | Register page |
|--------|--------------------|------------|----------------|
| Redirect after login | None (refresh only) | `callbackUrl` / referrer / role-based | N/A (login page handles login) |
| Redirect after register (no OTP) | Refresh only | N/A | `callbackUrl` or `/portal/dashboard` |
| Redirect after OTP | Refresh only | N/A | `/dashboard` (hardcoded) |
| Forgot password | Link to `/forgot-password`, close modal | Link to `/forgot-password` | N/A |
| Google sign-in | Yes | No (credentials only) | No |
| Facebook/Twitter | Buttons, no handlers | No | No |
| Keep Me Signed In | Checkbox (state only, not sent to API) | No | N/A |
| OTP resend | “Not implemented” toast | N/A | Same |
| i18n | Inline ar/en + useLocale | Inline + i18n() for errors | Inline + i18n for errors |
| `useEffect` import | N/A | N/A | **Missing** (bug) |

---

## 7. Recommendations

1. **Fix register page:** Add `useEffect` to the React import in `src/app/(auth)/register/page.tsx`.
2. **Popup redirect:** Consider using `callbackUrl` (and optionally role-based default) after modal login so users return to the page they were on (e.g. equipment or build-your-kit).
3. **Register page OTP success:** Use the same redirect logic as login (e.g. `callbackUrl` or role-based) instead of hardcoded `/dashboard`.
4. **Resend OTP:** Implement a dedicated resend endpoint (rate-limited) and wire “Resend code” in both modal and register page.
5. **Social buttons:** Either wire Facebook/Twitter in the modal or remove the buttons to avoid confusion.
6. **Copy:** Move OTP/resend strings in the modal into the same i18n system as the rest of auth for consistency and RTL.

---

## 8. File Reference

| Purpose | Path |
|--------|------|
| Auth modal | `src/components/auth/auth-modal.tsx` |
| Auth modal provider | `src/components/auth/auth-modal-provider.tsx` |
| Public layout client (mounts modal) | `src/components/public/public-layout-client.tsx` |
| Public header (triggers modal/links) | `src/components/public/public-header.tsx` |
| Mobile nav (triggers modal) | `src/components/public/mobile-nav.tsx` |
| Login page | `src/app/(auth)/login/page.tsx` |
| Register page | `src/app/(auth)/register/page.tsx` |
| Auth validators | `src/lib/validators/auth.validator.ts` |
| NextAuth config | `src/lib/auth/config.ts` |
| Register API | `src/app/api/auth/register/route.ts` |
| Verify-phone API | `src/app/api/auth/verify-phone/route.ts` |
