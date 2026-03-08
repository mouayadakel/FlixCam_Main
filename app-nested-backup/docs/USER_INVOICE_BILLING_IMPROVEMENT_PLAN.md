# User Invoice & Billing Data – Implementation & Improvement Plan

## What Was Implemented

### 1. User profile (optional billing fields)
- **Tax information** (`taxId`): Tax ID / VAT number, optional, max 50 chars.
- **Company name** (`companyName`): Optional, max 200 chars.
- **Natural location / billing address** (`billingAddress`): Optional, max 500 chars.

All three are stored on the **User** model and editable in the **Portal → Profile** page under the collapsible section **"معلومات الفاتورة والعنوان (اختياري)"**.

### 2. Link to invoices and quotes
- **Invoices**: When an invoice is loaded (by ID, list, create, update, generate from booking), the **customer** object includes `taxId`, `companyName`, and `billingAddress` from the User.
- **Quotes**: Same for quotes – customer on quote includes these fields.
- **Invoice PDF**: "Bill To" block shows, when present:
  - Name (or email)
  - Company name
  - Email
  - Tax ID (with label)
  - Billing address
- **Quote PDF**: "Customer" block uses the same structure.
- **Admin invoice detail**: Customer card shows company name, tax ID, and billing address when set.

### 3. API
- **GET /api/me**: Returns `taxId`, `companyName`, `billingAddress`.
- **PATCH /api/me**: Accepts optional `taxId`, `companyName`, `billingAddress` (all nullable).

### 4. Database
- **Migration**: `20260227000000_add_user_invoice_billing_fields` adds nullable columns to `User`: `taxId`, `companyName`, `billingAddress`.

---

## Improvement Plan (Next Steps)

### Short term
1. **Admin user edit**: Allow admins to set/override tax, company, and billing address for a user (e.g. in Admin → Users → [user] edit), so support can fix or complete data.
2. **Validation**: Optional server-side validation for `taxId` format (e.g. Saudi VAT length/pattern) and optional integration with ZATCA if needed.
3. **i18n**: Move Arabic labels in the profile form and PDFs into message files (`ar.json` / `en.json`) for consistency.

### Medium term
4. **Checkout prefilling**: On checkout, if the user is logged in, prefill receiver/billing from profile (company name, tax ID, address) where applicable.
5. **Invoice snapshot**: Optionally store a **snapshot** of customer billing data on the Invoice at creation time (e.g. `customerSnapshot: { name, email, companyName, taxId, billingAddress }`) so historical invoices stay correct if the user later changes their profile.
6. **Quotations**: Ensure any quotation PDF or email sent to the customer uses the same Bill To block (already done for quote PDF; extend to any email templates that show quote/invoice details).

### Long term
7. **Multiple billing profiles**: Allow users to save multiple "billing profiles" (e.g. personal vs company) and choose one per booking/invoice.
8. **Compliance**: If you need ZATCA e-invoicing, ensure tax ID and address are passed to the ZATCA payload and QR when generating compliant invoices.
9. **Audit**: Log when billing-related fields are changed (who, when) for support and compliance.

---

## Files Touched

| Area            | File(s) |
|----------------|--------|
| Schema         | `prisma/schema.prisma` (User) |
| Migration      | `prisma/migrations/20260227000000_add_user_invoice_billing_fields/migration.sql` |
| API            | `src/app/api/me/route.ts` (GET + PATCH) |
| Portal UI      | `src/components/features/portal/portal-profile-form.tsx` |
| Types          | `src/lib/types/invoice.types.ts`, `src/lib/types/quote.types.ts` |
| Invoice logic  | `src/lib/services/invoice.service.ts` (customer selects) |
| Quote logic    | `src/lib/services/quote.service.ts` (customer selects) |
| Invoice PDF    | `src/lib/services/pdf/invoice-pdf.ts` (Bill To) |
| Quote PDF      | `src/lib/services/pdf/quote-pdf.ts` (Customer) |
| Admin invoice  | `src/app/admin/(routes)/invoices/[id]/page.tsx` (customer card) |

---

## Commands

```bash
# Apply migration
npx prisma migrate deploy

# Or for dev (creates DB + applies)
npx prisma migrate dev --name add_user_invoice_billing_fields
```

No new env vars. Existing auth and permissions apply; only the logged-in user can update their own profile via `/api/me`.
