# FlixCam Auth Modal – Implementation Spec

**Version:** 1.0  
**Purpose:** Single source of truth for the global Login/Register modal on public routes (landing, equipment, cart, etc.).

---

## 1. Where the modal lives (global pattern)

- **Provider:** `AuthModalProvider` in [src/components/auth/auth-modal-provider.tsx](src/components/auth/auth-modal-provider.tsx). Context holds `isOpen`, `tab` ('register' | 'login'), `openAuthModal(tab?)`, `closeAuthModal()`, and `setTab(tab)`.
- **Mount:** The provider wraps only the public layout. [src/components/public/public-layout-client.tsx](src/components/public/public-layout-client.tsx) wraps `PublicHeader`, `main`, `PublicFooter`, `WhatsAppCta`, and `AuthModal` inside `AuthModalProvider`. [src/app/(public)/layout.tsx](src/app/(public)/layout.tsx) renders `PublicLayoutClient` (and the skip link).
- **Triggers:** Header and mobile nav call `openAuthModal('login')` or `openAuthModal('register')` instead of linking to `/login` or `/register`.

---

## 2. Visual tokens (Tailwind / theme)

| Token            | Usage                                              |
|------------------|----------------------------------------------------|
| Primary          | `bg-brand-primary` (#C92C37)                       |
| Primary hover    | `hover:bg-brand-primary-hover` (#A8242D)            |
| Text main        | `text-text-heading`                                 |
| Text muted       | `text-text-muted`, `text-text-body`                |
| Border           | `border-border-light`, `border-border-input`       |
| Overlay          | Dimmed + blurred: `bg-black/50 backdrop-blur-md`   |
| Card             | `bg-white`, `rounded-public-card` (8px), `shadow-modal` |
| Input padding    | `px-4 py-3`                                        |
| Label            | `text-sm font-medium`                              |
| Active tab       | `border-b-2 border-brand-primary`                  |

Font: body uses `font-arabic` (Cairo) / RTL when locale is Arabic. Modal content uses `dir={isRtl ? 'rtl' : 'ltr'}`.

---

## 3. Modal structure

- **Overlay:** Dimmed and **blurred** (`bg-black/50 backdrop-blur-md`) so content behind the popup is blurred. Implemented via `DialogContent` prop `overlayClassName` (see [src/components/ui/dialog.tsx](src/components/ui/dialog.tsx)).
- **Card:** Centered, max-width 400px, white, 8px radius, 32px padding.
- **Header:** Logo "FlixCam.rent" centered; tabs **REGISTER** | **LOGIN** with active tab 2px primary bottom border.
- **Body:** Register form (name optional, email, password, confirm password) or Login form (email, password). Full-width primary button. Below the form: "Already have an account? **Log in**" / "Don't have an account? **Register**" to switch tab (no navigation).

---

## 4. RBAC and redirect rules

After successful `signIn(..., redirect: false)` (or register then signIn):

1. Close modal, `router.refresh()`, then `getSession()`.
2. Read `session.user.role` (string).
3. Redirect:
   - **Client role** (`DATA_ENTRY`): `/portal/dashboard`
   - **Staff/Admin** (any other role): `/admin/dashboard`

Optional: respect `callbackUrl` from URL when valid and allowed for that role.

---

## 5. Files (checklist)

| Action | File |
|--------|------|
| Add | `src/components/auth/auth-modal-provider.tsx` – context + provider |
| Add | `src/components/auth/auth-modal.tsx` – Dialog, tabs, Register/Login forms, blurred overlay |
| Add | `src/components/public/public-layout-client.tsx` – client wrapper with AuthModalProvider + AuthModal |
| Edit | `src/app/(public)/layout.tsx` – use PublicLayoutClient |
| Edit | `src/components/public/public-header.tsx` – Login/Register open modal |
| Edit | `src/components/public/mobile-nav.tsx` – Login/Register open modal, then close nav |
| Edit | `src/components/ui/dialog.tsx` – optional `overlayClassName` on DialogContent |

Existing auth pages [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) and [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx) remain for direct URLs (e.g. middleware redirect with `callbackUrl`).
