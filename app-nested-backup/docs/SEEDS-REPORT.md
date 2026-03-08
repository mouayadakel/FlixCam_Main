# FlixCam — Seeds Report

Overview of all database seed scripts in the project: what they seed, how to run them, and dependencies.

---

## 1. Main seed (comprehensive)

| Item | Details |
|------|--------|
| **File** | `prisma/seed.ts` |
| **Command** | `npm run db:seed` or `npm run seed` |
| **Runner** | `tsx prisma/seed.ts` |
| **Production** | Disabled unless `ALLOW_SEED_IN_PRODUCTION=true` |

### What it seeds

| Entity | Count / description |
|--------|----------------------|
| **Users** | Admin: `admin@flixcam.rent` (password: `admin123`), Test: `test@flixcam.rent` (password: `test123`) |
| **Permissions** | 21 permissions (booking.*, equipment.*, payment.*, user.*, audit.*, settings.*) |
| **UserPermission** | All permissions assigned to admin and test user |
| **Categories** | 12 top-level (Cameras, Lenses, Lighting, Audio, etc.) |
| **Lighting subcategories** | 3: LED Panels, COB Lights, Softboxes & Modifiers |
| **Brands** | 39 brands (Sony, Canon, ARRI, RED, Blackmagic, DJI, etc.) |
| **Equipment** | 0 (seeding disabled in script: “no equipment items”) |
| **Shoot types** | 12 (Wedding, Commercial, Product, Event, Interview, Documentary, etc.) with questionnaire and category flows |
| **ShootTypeRecommendation** | By budget tier (Essential / Professional / Premium); only if equipment with matching SKUs exists |
| **Feature flags** | 30+ (checkout, payments, WhatsApp, AI, kit builder, studios, admin sections, etc.) |
| **Notifications** | 3 sample in-app notifications for admin |
| **Hero banner** | “Home” banner with 6 slides (AR/EN/ZH, Unsplash images) |
| **Studios** | Up to 5 studios (main, live-stream, photo, green-screen, compact) with packages, add-ons, FAQs, media |
| **FaqItem** | 19 FAQ items (replace-all), AR/EN |
| **PolicyItem** | 6 defaults + full Terms (from `scripts/data/terms-policy-body`) |
| **Checkout form** | Via `seed-checkout-form.ts`: sections and fields for Step 1 (receiver, fulfillment, time, legal, emergency) |

### Dependencies

- **User model**: Expects `User` with fields used in `create`/`upsert` (e.g. if your schema has `idVerificationStatus`, it must exist in DB or seed will fail).
- **Checkout form**: Called inside main seed: `import('./seed-checkout-form')` → `seedCheckoutForm()`.

### Notes

- Equipment seeding is intentionally disabled (no items).
- Shoot type recommendations only create records when equipment with SKUs like `CAM-A7S3`, `LENS-SIGMA-2470` exist.

---

## 2. RBAC seed (roles, permissions, menu)

| Item | Details |
|------|--------|
| **File** | `prisma/seed-rbac.ts` |
| **Command** | `npm run db:seed:rbac` |
| **Runner** | `tsx prisma/seed-rbac.ts` |

### What it seeds

| Entity | Count / description |
|--------|----------------------|
| **PermissionCategory** | 28 categories (booking, equipment, payment, client, invoice, contract, quote, maintenance, warehouse, delivery, approval, audit, dashboard, seo, category, brand, studio, kit, pricing, import, reports, marketing, coupon, settings, user, system, ai, vendor) |
| **Permission** | 100+ permissions (CRUD per domain + wildcards like `booking.*`, `*`) |
| **Role** | 7 system (super_admin, admin, finance, data_entry, warehouse_manager, delivery, technician) + 8 custom (sales_manager, customer_service, marketing_manager, risk_manager, approval_agent, auditor, ai_operator) |
| **RolePermission** | Assigns permissions to each role |
| **RoleConflict** | 3 conflicts (e.g. finance vs data_entry, warehouse_manager vs finance) |
| **MenuItem** | 50+ admin menu items (Command Center, Booking Engine, Smart Sales, Inventory, Field Ops, Finance & Legal, CRM & Marketing, Settings) with hierarchy |
| **MenuItemPermission** | Links menu items to permissions |

### When to use

- After schema has RBAC models (PermissionCategory, Permission, Role, RolePermission, RoleConflict, MenuItem, MenuItemPermission).
- Main seed uses a smaller permission set; RBAC seed is the full RBAC + menu structure.

---

## 3. Checkout form seed

| Item | Details |
|------|--------|
| **File** | `prisma/seed-checkout-form.ts` |
| **Command** | `npm run db:seed:checkout-form` |
| **Runner** | `tsx prisma/seed-checkout-form.ts` |
| **Also run by** | Main seed (`prisma/seed.ts`) |

### What it seeds

| Entity | Description |
|--------|-------------|
| **CheckoutFormSection** | 6 sections for Step 1: “Who will receive?”, “Receiver info”, “Fulfillment method”, “Time preference”, “Legal agreement”, “Emergency contact” |
| **CheckoutFormField** | Fields per section (receiver_type, receiver_name, receiver_id_number, receiver_phone, receiver_id_photo, fulfillment_method, delivery address, preferred_time_slot, legal_agreement, emergency contact) |

Idempotent: skips if any `CheckoutFormSection` already exists.

---

## 4. Footer seed

| Item | Details |
|------|--------|
| **File** | `prisma/seed-footer.ts` |
| **Command** | `npm run db:seed:footer` |
| **Runner** | `tsx prisma/seed-footer.ts` |

### What it seeds

| Entity | Description |
|--------|-------------|
| **FooterSettings** | One row: enabled, layout, colors |
| **FooterBrand** | Logo paths, company name AR/EN, description |
| **FooterContact** | Phone, email, address (with WhatsApp, maps link) |
| **FooterSocialLink** | Instagram, WhatsApp, Twitter, TikTok, YouTube, Snapchat |
| **FooterLegal** | Copyright AR/EN, auto year, layout, legal links (Terms, Privacy, Return) |
| **FooterNewsletter** | Titles, placeholder, button, success message AR/EN |
| **FooterColumn** | 4 columns: Categories, About, Policies, Quick Links with links |

Idempotent: skips if `FooterSettings` already exists.

---

## 5. Blog seed

| Item | Details |
|------|--------|
| **File** | `prisma/seed-blog.ts` |
| **Command** | `npm run db:seed:blog` |
| **Runner** | `tsx prisma/seed-blog.ts` |

### What it seeds

| Entity | Count / description |
|--------|----------------------|
| **BlogCategory** | 5 (Cameras, Lighting, Audio, Rental Tips, Industry News) |
| **BlogAuthor** | 1: “فريق فليكس كام” / Flixcam team |
| **BlogPost** | 10 sample posts (placeholders + one Unsplash image), some featured/trending |

Idempotent: only creates when counts are 0.

---

## 6. Lighting subcategories (script)

| Item | Details |
|------|--------|
| **File** | `scripts/seed-lighting-subcategories.ts` |
| **Command** | `npm run db:seed:lighting-subcategories` |
| **Runner** | `tsx scripts/seed-lighting-subcategories.ts` |

### What it seeds

- **Category** (3): LED Panels, COB Lights, Softboxes & Modifiers as children of category `lighting`.
- Invalidates public categories cache.

**Requires:** Main seed first (category “Lighting” must exist).

---

## 7. Policies-only seed (script)

| Item | Details |
|------|--------|
| **File** | `scripts/seed-policies.ts` |
| **Command** | (none in package.json; run manually) `npx tsx scripts/seed-policies.ts` |
| **Runner** | `tsx scripts/seed-policies.ts` |

### What it seeds

- **PolicyItem**: 6 default policies (Insurance, Deposit, ID Requirements, Late Fees, Damage & Loss, Cancellation) + full Terms from `scripts/data/terms-policy-body`.

Use when admin policies page is empty and full seed already ran.

---

## 8. E2E seed (CI / tests)

| Item | Details |
|------|--------|
| **File** | `scripts/seed-e2e.ts` |
| **Command** | (CI) `tsx scripts/seed-e2e.ts` |
| **Runner** | `tsx scripts/seed-e2e.ts` |

### What it seeds

- **FeatureFlag** `enable_studios` = true.
- **Studio** “E2E Test Studio” (`e2e-studio`) if not present.

Minimal seed for E2E so `/studios` has at least one studio.

---

## Package.json script reference

| Script | Command |
|--------|--------|
| `db:seed` | `tsx prisma/seed.ts` |
| `seed` | `tsx prisma/seed.ts` |
| `deploy:db:with-seed` | `prisma migrate deploy && tsx prisma/seed.ts` |
| `db:seed:rbac` | `tsx prisma/seed-rbac.ts` |
| `db:seed:checkout-form` | `tsx prisma/seed-checkout-form.ts` |
| `db:seed:footer` | `tsx prisma/seed-footer.ts` |
| `db:seed:blog` | `tsx prisma/seed-blog.ts` |
| `db:seed:lighting-subcategories` | `tsx scripts/seed-lighting-subcategories.ts` |

---

## Recommended order for a fresh DB

1. **Migrations**: `npx prisma migrate deploy`
2. **Main seed**: `npm run db:seed` (includes checkout form).
3. **RBAC** (if using full RBAC): `npm run db:seed:rbac`
4. **Footer**: `npm run db:seed:footer`
5. **Blog**: `npm run db:seed:blog`
6. **Lighting subcategories** (optional): `npm run db:seed:lighting-subcategories`

For production, either set `ALLOW_SEED_IN_PRODUCTION=true` for the main seed or run only the optional seeds (footer, blog, RBAC) after ensuring schema matches (e.g. no missing columns like `idVerificationStatus` on `User`).

---

## Summary table

| Seed | File | Idempotent | Run by main seed |
|------|------|------------|-------------------|
| Main | `prisma/seed.ts` | Yes (upserts) | — |
| RBAC | `prisma/seed-rbac.ts` | Yes | No |
| Checkout form | `prisma/seed-checkout-form.ts` | Yes (skip if sections exist) | Yes |
| Footer | `prisma/seed-footer.ts` | Yes (skip if footer exists) | No |
| Blog | `prisma/seed-blog.ts` | Yes (skip if data exists) | No |
| Lighting subcategories | `scripts/seed-lighting-subcategories.ts` | Yes | No (but main seed creates same 3 under Lighting) |
| Policies only | `scripts/seed-policies.ts` | Yes (create if not exists) | No (main seed does policy items) |
| E2E | `scripts/seed-e2e.ts` | Yes | No |
