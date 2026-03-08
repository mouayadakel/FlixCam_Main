# 🔴 MEGA PRODUCTION AUDIT — Camera Rental & Studio Booking Website
### Paste this fully into Cursor (Agent Mode — make sure it has full codebase access)

---

## 🎯 ROLE & MISSION

You are a **Senior Full-Stack Auditor, Security Engineer, QA Lead, UX Reviewer, and Prompt Engineer** combined into one. This website is a **Camera Rental & Studio Booking platform** and is approaching production launch. Your job is to perform the most thorough, exhaustive, and uncompromising audit possible — leaving zero stone unturned.

**Your output must be a structured report** covering every section below. For every issue found, provide:
- 📍 **Location** (file name + line number)
- 🔴 **Severity** (Critical / High / Medium / Low / Info)
- 📝 **Description** of the problem
- ✅ **Recommended Fix**

Do not summarize. Do not skip. Do not assume something works — **verify it in the code**.

---

## 📋 PHASE 1 — PROJECT MAP & COMPLETENESS SCAN

1. **Generate a full project map:**
   - List every page/route (public + authenticated + admin/control panel)
   - List every API endpoint (REST/GraphQL) with its HTTP method, auth requirement, and what it does
   - List every database table/collection with all fields and their types
   - List every third-party service integrated (payment gateway, email, SMS, AI, storage, barcode, etc.)
   - List every environment variable used across the entire codebase

2. **Cross-check completeness:**
   - Is every UI form backed by an API endpoint?
   - Is every API endpoint connected to a database operation?
   - Is every database field visible/editable somewhere in the control panel?
   - Are there any buttons, links, or CTAs that lead nowhere or are not wired up?
   - Are there any placeholder texts like "Coming Soon", "TODO", "Lorem ipsum", or hardcoded dummy data left in the UI?
   - Are there any pages that exist in the router but have no content or are unreachable from the navigation?

3. **Check `.env` / `.env.example`:**
   - List all env vars referenced in code
   - Flag any that are missing from `.env.example`
   - Flag any real secrets accidentally committed to the repository
   - Flag any hardcoded API keys, passwords, or tokens anywhere in the code

---

## 📋 PHASE 2 — CODE QUALITY & ERROR AUDIT

1. Run a complete static analysis across all files and report:
   - Syntax errors
   - Runtime errors (undefined variables, null pointer risks, type mismatches)
   - Unused variables, unused imports, dead code
   - `console.log` / `console.error` / `debugger` left in production code
   - `TODO`, `FIXME`, `HACK`, `TEMP`, `XXX` comments
   - Any `any` TypeScript types (if TypeScript is used) — flag each one
   - Circular dependencies
   - Missing `await` on async calls
   - Unhandled promise rejections
   - `try/catch` blocks that silently swallow errors with no logging or user feedback

2. **API Layer Review:**
   - Every API endpoint must validate its input — flag any endpoint with no input validation
   - Every API endpoint must handle errors and return proper HTTP status codes — flag any that return 200 on errors
   - Every API endpoint must be tested: manually trace through the code and confirm the full request→validation→business logic→database→response chain is correct
   - Check for any API endpoints that are defined but never called from the frontend
   - Check for any API calls in the frontend that point to endpoints that don't exist

3. **Frontend Review:**
   - Every form must have: client-side validation + server-side validation + error message display
   - Every async data fetch must have: loading state + error state + empty state
   - Every button that triggers a destructive action must have a confirmation dialog
   - Check for broken internal links (href="#", missing routes, wrong paths)
   - Check for missing alt text on images (accessibility)
   - Check for any images with broken src paths

---

## 📋 PHASE 3 — DATABASE AUDIT

1. **Schema Completeness:**
   - Every table must have: `id` (primary key), `created_at`, `updated_at`
   - Every table that represents a user-owned resource must have a `user_id` or `owner_id` foreign key
   - All foreign keys must have corresponding indexes
   - Soft delete (`deleted_at`) must exist on: bookings, invoices, orders, users, equipment items — never permanently delete business records
   - Check for any field referenced in the code that doesn't exist in the schema
   - Check for any schema field that is never read or written by the application

2. **Data Integrity:**
   - Can a user double-book the same equipment or studio for overlapping time slots? If yes — CRITICAL BUG
   - Can a booking be created for a date in the past? Should it be blocked?
   - Can stock go negative? Is there inventory validation before booking confirmation?
   - Are cascade deletes properly set (e.g., deleting a user should handle their bookings gracefully)?

3. **Performance:**
   - Identify any N+1 query problems
   - Identify queries fetching entire tables without pagination or limits
   - Check that all search/filter fields are properly indexed

---

## 📋 PHASE 4 — AUTHENTICATION & SECURITY AUDIT

1. **Authentication:**
   - Verify every protected route (frontend + API) requires authentication — list any that are missing auth guards
   - Verify role-based access control (RBAC): customers should not access admin routes, warehouse managers should only access their module, etc.
   - Check JWT/session: proper expiration, refresh token logic, secure storage (httpOnly cookies — NOT localStorage for auth tokens)
   - Verify password hashing uses bcrypt or argon2 — NOT md5, sha1, or plain text
   - Verify password reset tokens are single-use and expire within a reasonable time (15–60 min)
   - Check that account enumeration is not possible through login or password reset responses

2. **API Security:**
   - Every API endpoint that modifies data must verify the authenticated user owns that resource (authorization, not just authentication)
   - Check CORS configuration — should NOT be `*` in production
   - Check rate limiting on: login (5 attempts max), registration, password reset, booking creation, and all public endpoints
   - Check for SQL injection: any raw queries must use parameterized statements
   - Check for NoSQL injection if using MongoDB
   - Check for mass assignment vulnerabilities (user sending extra fields that get saved to DB)

3. **File Upload Security:**
   - File type must be validated server-side by MIME type (not just extension)
   - File size limits enforced
   - Files must NOT be stored in a publicly accessible directory without signed URLs
   - No executable file types (.php, .exe, .sh, .js) can be uploaded
   - Check that uploaded filenames are sanitized (no path traversal like `../../etc/passwd`)

4. **Frontend Security:**
   - Check for XSS vulnerabilities: any place where user-generated content is rendered as raw HTML
   - CSRF protection on all state-changing forms
   - No sensitive data (tokens, passwords, private keys) stored in localStorage
   - Verify HTTPS is enforced and there's no mixed content
   - Check for clickjacking protection (X-Frame-Options or CSP)
   - Error messages must not expose stack traces, database names, or internal paths to the user

---

## 📋 PHASE 5 — EQUIPMENT RENTAL MODULE AUDIT

Verify each of the following exists and works correctly:

- [ ] Add / Edit / Delete equipment items from control panel
- [ ] Equipment fields: Name, SKU/Asset ID, Serial Number, Category, Description, Images (multiple), Daily Rate, Weekly Rate, Monthly Rate, Deposit Amount, Condition Notes, Status (Available / Rented / Under Maintenance / Retired), Stock Quantity
- [ ] Availability calendar: blocks dates correctly when booked — no double booking possible
- [ ] When booking is created → stock decrements and dates block
- [ ] When booking is cancelled → stock restores and dates unblock
- [ ] When booking is completed → equipment marked as returned, deposit logic triggered
- [ ] Equipment search by name, category, price range, availability date range
- [ ] Equipment filtering and sorting work correctly
- [ ] Equipment detail page loads all fields and images correctly
- [ ] Accessories / add-ons can be linked to main equipment items
- [ ] Damaged equipment reporting — field to log damage and adjust deposit
- [ ] Equipment maintenance scheduling — dates blocked automatically during maintenance

---

## 📋 PHASE 6 — STUDIO BOOKING MODULE AUDIT

Verify each of the following exists and works correctly:

- [ ] Add / Edit / Delete studio rooms from control panel
- [ ] Studio fields: Name, Description, Capacity, Amenities, Images (multiple), Hourly Rate, Half-day Rate, Full-day Rate, Minimum Booking Hours, Deposit Amount, Status
- [ ] Studio availability calendar — no double booking for same room on same time slot
- [ ] Time slot booking (specific hours, not just full days)
- [ ] Studio add-ons: lighting packages, backdrops, tripods, crew, catering, etc.
- [ ] Studio booking confirmation with summary of selected services
- [ ] Buffer time between bookings (cleaning/setup time) — is this configurable?
- [ ] Studio booking calendar view in control panel showing all rooms side by side

---

## 📋 PHASE 7 — BOOKING FLOW & USER EXPERIENCE AUDIT

Walk through the **complete customer booking flow** and verify each step:

1. **Browse** → Equipment/Studio listing page loads, filters work, results are accurate
2. **Select** → Item detail page: all info displayed, calendar shows correct availability, "Book Now" works
3. **Configure** → Rental dates, hours, accessories/add-ons — pricing updates dynamically and correctly in real time
4. **Account** → User can register, log in, or book as guest (if supported). Registration form validates all fields
5. **Review** → Booking summary page shows: item names, rental period, unit price, subtotal per item, add-ons, taxes, deposit, discount (if any), **GRAND TOTAL** — verify all math
6. **Payment** → Payment gateway integration works, test with sandbox/test credentials
7. **Confirmation** → Booking confirmation page shown, confirmation email sent to customer, notification sent to admin
8. **My Bookings** → Customer can view all their bookings, statuses, and invoices
9. **Cancellation** → Customer can cancel (within policy), refund logic triggers correctly, availability restored

---

## 📋 PHASE 8 — INVOICE & MATH AUDIT ⚠️ CRITICAL

This section is critical. Verify **every single calculation** in the system:

1. **Rental Price Calculation:**
   - Daily rate × number of days = subtotal (verify rounding is correct, not truncating)
   - Weekly/monthly rates applied when applicable (e.g., 7 days should use weekly rate if cheaper)
   - Partial day billing logic (if hourly): hours × hourly rate = correct
   - Multi-item orders: each item calculated independently, then summed correctly

2. **Invoice Fields — verify ALL exist on every invoice:**
   - [ ] Invoice Number (unique, sequential or UUID)
   - [ ] Invoice Date
   - [ ] Due Date
   - [ ] Customer Name, Address, Contact Info
   - [ ] Company Name / Logo (your business info)
   - [ ] Line items: Description, Qty, Unit Price, Line Total
   - [ ] Subtotal (sum of all line items)
   - [ ] Discount (amount or %, applied correctly)
   - [ ] Tax (VAT/GST — correct rate, applied to correct base)
   - [ ] Deposit Amount
   - [ ] Grand Total
   - [ ] Payment Status (Unpaid / Partially Paid / Paid)
   - [ ] Amount Paid
   - [ ] Balance Due = Grand Total − Amount Paid (verify this math)
   - [ ] Payment Method
   - [ ] Notes / Terms & Conditions

3. **سند الأمر (Purchase/Payment Order):**
   - Does a سند أمر (order voucher / payment authorization document) exist in the system?
   - Is it generated for every booking or payment transaction?
   - Does it include: voucher number, date, payer name, amount in numbers AND words (Arabic), purpose/description, authorized signature field, reference to original invoice?
   - Can it be printed and exported as PDF?
   - Is it numbered sequentially and stored in the database?
   - Can the control panel list, search, and filter all سندات الأمر?

4. **Deposit Logic:**
   - Deposit collected at booking → stored against the booking record
   - Deposit returned on completion → refund flow exists
   - Deposit partially/fully forfeited on damage → admin can adjust and document reason
   - Deposit reflected correctly in invoice Balance Due

5. **Late Return Fees:**
   - Is there a late return fee system? If not — flag as missing feature
   - If yes: late fee calculation is correct and appears on the invoice

---

## 📋 PHASE 9 — CONTROL PANEL (ADMIN) AUDIT

Verify the control panel has all the following:

**Dashboard:**
- [ ] Total bookings today / this week / this month
- [ ] Revenue today / this week / this month
- [ ] Upcoming bookings (next 7 days)
- [ ] Equipment currently out on rental
- [ ] Overdue returns
- [ ] Low stock / availability alerts
- [ ] Recent activity feed

**Bookings Management:**
- [ ] View all bookings with filters (status, date range, customer, equipment)
- [ ] Create booking manually (admin-initiated)
- [ ] Edit booking (change dates, items, add notes)
- [ ] Cancel booking with reason
- [ ] Mark as returned / completed
- [ ] Assign booking to warehouse manager for fulfillment
- [ ] Booking timeline/calendar view

**Customer Management:**
- [ ] View all customers
- [ ] Customer profile: personal info, booking history, total spend, blacklist flag
- [ ] Add / Edit / Delete customers
- [ ] Customer documents upload (ID, contracts)
- [ ] Customer credit limit or deposit waiver settings

**Equipment Management:**
- [ ] Full CRUD for equipment items
- [ ] Bulk import equipment via Excel/CSV — does this work? Test it
- [ ] Equipment availability calendar (all items)
- [ ] Maintenance scheduling
- [ ] Damage reports log

**Studio Management:**
- [ ] Full CRUD for studios
- [ ] Studio availability calendar
- [ ] Add-on packages management

**Invoice Management:**
- [ ] List all invoices with filters
- [ ] Create manual invoice
- [ ] Edit invoice
- [ ] Mark as paid / partially paid
- [ ] Send invoice by email to customer
- [ ] Download invoice as PDF — verify PDF layout is professional and complete
- [ ] سندات الأمر list, creation, and PDF export

**Reports & Analytics:**
- [ ] Revenue report (by date range, by equipment, by customer)
- [ ] Most rented items report
- [ ] Utilization rate per equipment/studio
- [ ] Outstanding payments report
- [ ] Export reports to Excel/PDF

**Settings:**
- [ ] Business info (name, logo, address, tax number, contact info)
- [ ] Tax rate configuration
- [ ] Deposit policy settings
- [ ] Late return fee configuration
- [ ] Email/notification templates
- [ ] Booking policies (cancellation window, minimum notice, etc.)

---

## 📋 PHASE 10 — API MANAGEMENT PAGE AUDIT

The control panel has a dedicated page for managing API integrations. Verify:

- [ ] The API settings page exists and is accessible from the control panel navigation
- [ ] The following integrations have configuration fields (key, secret, webhook URL, toggle on/off):
  - Payment Gateway (Stripe / Moyasar / PayTabs / Tap Payments — whichever is used)
  - Email Service (SendGrid / Mailgun / Amazon SES / SMTP)
  - SMS Provider (Twilio / Unifonic / Taqnyat)
  - AI/Chatbot Service (OpenAI / Anthropic / custom)
  - Cloud Storage (AWS S3 / Cloudinary / Supabase Storage)
  - Barcode/QR Scanner integration
  - Google Calendar / iCal sync (for bookings)
  - Any other third-party services used
- [ ] API keys are stored encrypted in the database — never plain text
- [ ] API keys are masked in the UI (show only last 4 characters)
- [ ] "Test Connection" button exists for each integration to verify the credentials work
- [ ] Changes to API settings are logged in an audit trail
- [ ] If an API key is invalid or expired, the system shows a clear error — not a silent failure

---

## 📋 PHASE 11 — MULTILINGUAL AUDIT (Arabic / English / Chinese)

1. **Language Switching:**
   - [ ] Language switcher is visible and functional on all pages of the main website
   - [ ] Language preference is saved (localStorage or user profile)
   - [ ] RTL (Right-to-Left) layout correctly applied when Arabic is selected — check: text alignment, button placement, icon mirroring, form field direction, navigation direction, calendar direction
   - [ ] LTR layout correct for English and Chinese

2. **Translation Completeness — check every visible string:**
   - [ ] Navigation menu items — all 3 languages
   - [ ] Hero section / banners — all 3 languages
   - [ ] Equipment listing page: all labels, filters, buttons — all 3 languages
   - [ ] Equipment detail page: all fields, CTAs — all 3 languages
   - [ ] Studio listing and detail pages — all 3 languages
   - [ ] Booking flow (all steps) — all 3 languages
   - [ ] Checkout / payment page — all 3 languages
   - [ ] Confirmation page and confirmation email — all 3 languages
   - [ ] My Bookings / account page — all 3 languages
   - [ ] Error messages and validation messages — all 3 languages
   - [ ] Footer links and legal text — all 3 languages
   - [ ] Invoice PDF — does it support Arabic text correctly (right-to-left, Arabic numerals option)?
   - [ ] سند الأمر document — is the Arabic version complete with correct Arabic typography?
   - [ ] Flag any hardcoded English strings that are NOT going through the translation system
   - [ ] Flag any missing translation keys (key exists but translation value is empty or still in English)
   - [ ] Chinese translations: verify characters are correct (Simplified vs Traditional — which is intended?)

3. **Date & Number Formatting:**
   - [ ] Dates formatted correctly per locale (DD/MM/YYYY for Arabic, etc.)
   - [ ] Currency symbol and number formatting correct per locale
   - [ ] Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) vs Western numerals — which is used in Arabic mode? Is this intentional?

---

## 📋 PHASE 12 — WAREHOUSE MANAGER MODULE AUDIT

1. **Barcode / QR Scanning:**
   - [ ] Does a barcode/QR scanning feature exist for the warehouse manager?
   - [ ] If YES: verify it works on mobile browser (camera access) AND with a handheld scanner (USB HID input)
   - [ ] Scanning an equipment barcode should: pull up the item details, show its current booking status, and allow the manager to mark it as "checked out" or "checked in"
   - [ ] Can barcodes/QR codes be generated and printed for each equipment item from the control panel?
   - [ ] Is there a print-all-barcodes function for bulk labeling?
   - [ ] Does scanning confirm the correct item is being dispatched against the correct booking?
   - [ ] If NO barcode system exists → **FLAG AS MISSING CRITICAL FEATURE** for a rental business

2. **Fulfillment Workflow:**
   - [ ] Warehouse manager can see today's outgoing orders (items to dispatch)
   - [ ] Warehouse manager can see today's returning orders (items to receive)
   - [ ] Each order shows: customer name, booking ID, item name, serial number, planned dispatch/return time
   - [ ] Manager can mark items as dispatched (with optional condition photo upload)
   - [ ] Manager can mark items as returned (with damage check — flag damage to admin)
   - [ ] Manager receives notifications for new orders assigned to them

---

## 📋 PHASE 13 — AI CHATBOT AUDIT

1. **Chatbot Existence & Placement:**
   - [ ] Is an AI chatbot present on the main website?
   - [ ] Is it visible and accessible (chat bubble or embedded) on all relevant pages?

2. **Functionality Testing — test each scenario:**
   - [ ] "What cameras do you have available?" → should return equipment list or direct to listing page
   - [ ] "I want to book a studio for tomorrow" → should guide through booking flow
   - [ ] "What is the price of [specific item]?" → should return correct price
   - [ ] "I want to cancel my booking" → should explain cancellation policy and provide path to cancel
   - [ ] "Do you offer discounts?" → should handle gracefully
   - [ ] Arabic language input: "ما هي الكاميرات المتاحة؟" → should respond in Arabic correctly
   - [ ] Chinese language input → should respond in Chinese correctly
   - [ ] Fallback for unknown questions → polite fallback message + offer to connect to human support
   - [ ] Does the chatbot have access to real inventory data, or is it only answering general questions?

3. **Chatbot Configuration (Control Panel):**
   - [ ] Can the chatbot's greeting message be customized from the control panel?
   - [ ] Can the chatbot's knowledge base / FAQs be updated from the control panel?
   - [ ] Is the OpenAI / AI API key configured through the API settings page?
   - [ ] Are chatbot conversations logged and viewable in the control panel?
   - [ ] Is there a handover-to-human feature (live chat escalation)?

---

## 📋 PHASE 14 — EXCEL IMPORT / EXPORT AUDIT

1. **Import Equipment via Excel:**
   - [ ] Upload button exists in control panel equipment section
   - [ ] Accepts .xlsx and .csv formats
   - [ ] Sample/template Excel file available for download so users know the correct format
   - [ ] Validates data before importing: required fields, data types, duplicate SKUs
   - [ ] Shows a preview of the data before committing the import
   - [ ] Clear error messages for invalid rows (show row number + what's wrong)
   - [ ] Successful import shows count: "X items imported, Y skipped (duplicates), Z errors"
   - [ ] Test the import now with a real Excel file — does it work end-to-end?

2. **Import Customers via Excel:**
   - [ ] Same validation and preview flow as equipment import
   - [ ] Handles duplicate email addresses gracefully (skip or update, not crash)

3. **Export to Excel:**
   - [ ] Export bookings to Excel — does it export ALL columns with correct data?
   - [ ] Export invoice list to Excel
   - [ ] Export customer list to Excel
   - [ ] Export equipment list to Excel
   - [ ] Export reports to Excel
   - [ ] Verify exported files open correctly in Microsoft Excel (not just Google Sheets)
   - [ ] Arabic text in exports renders correctly (not garbled)

---

## 📋 PHASE 15 — NOTIFICATIONS & COMMUNICATIONS AUDIT

Verify these notifications are implemented and working:

**Customer Notifications:**
- [ ] Booking confirmation email (with booking summary + invoice PDF attached)
- [ ] Payment receipt email
- [ ] Booking reminder email (24–48 hours before rental start)
- [ ] Return reminder email (24 hours before return due date)
- [ ] Booking cancellation email
- [ ] Invoice email with PDF
- [ ] Account registration welcome email
- [ ] Password reset email

**Admin/Staff Notifications:**
- [ ] New booking alert to admin
- [ ] Payment received alert
- [ ] Cancellation alert
- [ ] Overdue return alert (equipment not returned on time)
- [ ] Low stock / all units booked alert
- [ ] New customer registration alert

**SMS Notifications (if configured):**
- [ ] Booking confirmation SMS to customer
- [ ] Return reminder SMS

**In-App Notifications:**
- [ ] Notification bell in control panel
- [ ] Unread count badge
- [ ] Mark as read functionality

---

## 📋 PHASE 16 — PAYMENT & FINANCIAL AUDIT

- [ ] Payment gateway test mode is working (use sandbox credentials to complete a test transaction)
- [ ] Successful payment updates booking status to "Confirmed / Paid"
- [ ] Failed payment shows clear error to customer and does NOT confirm the booking
- [ ] Webhook from payment gateway is implemented to handle async payment events
- [ ] Refund flow: can admin issue a refund? Does it reflect in the booking and invoice?
- [ ] Partial payment support (if applicable): pay deposit now, remainder later
- [ ] Invoice is generated automatically on booking confirmation
- [ ] Invoice PDF is accurate and professionally formatted
- [ ] VAT/Tax is calculated correctly (verify rate matches configured setting)
- [ ] All financial transactions are logged with: timestamp, amount, user, type, reference ID
- [ ] No payment can be processed for an already-cancelled or completed booking

---

## 📋 PHASE 17 — DUPLICATION & CONSISTENCY AUDIT

1. **Check for duplicate:**
   - Duplicate API routes (same path defined twice with different behavior)
   - Duplicate database records possible (can same email register twice? Can same SKU be added twice?)
   - Duplicate booking possible (same user, same item, overlapping dates)
   - Duplicate invoice numbers
   - Duplicate component names (two components doing the same thing)
   - Duplicate utility functions

2. **Consistency check:**
   - Date format consistent everywhere (not DD/MM/YYYY in some places and MM/DD/YYYY in others)
   - Currency format consistent everywhere
   - Status labels consistent (not "active" in DB but "Active" in UI and "ACTIVE" in another place)
   - Error message tone and format consistent
   - Loading spinner/skeleton used consistently across all async operations

---

## 📋 PHASE 18 — MISSING FEATURES CHECKLIST

Evaluate if the following features — standard for a professional rental business — are present. Flag any that are missing:

- [ ] **Contract / Rental Agreement** — PDF generated per booking for customer signature
- [ ] **Customer ID verification upload** — customer must upload national ID or passport before booking
- [ ] **Blacklist management** — ability to flag customers who damaged equipment or defaulted
- [ ] **Loyalty / discount system** — returning customers, coupon codes, promotional pricing
- [ ] **Waitlist** — customer can join waitlist if item is unavailable on their desired dates
- [ ] **Equipment bundle packages** — rent camera + lens + tripod as a bundle at a package price
- [ ] **Insurance / damage waiver option** — optional insurance add-on at checkout
- [ ] **Driver / delivery service** — option to deliver equipment to customer location (with address and delivery fee)
- [ ] **Online check-in** — customer confirms rental details online before pickup
- [ ] **Review & rating system** — customers can rate equipment after rental
- [ ] **Referral program** — customers refer others for discounts
- [ ] **Multi-currency support** — if targeting international customers
- [ ] **Google Calendar sync** — bookings sync to Google Calendar
- [ ] **iCal export** — customer can export their booking to their calendar
- [ ] **Public availability calendar** — customers can see availability without being logged in
- [ ] **Booking hold / reservation** — hold equipment for X hours while customer completes payment
- [ ] **Admin audit log** — track all admin actions (who changed what, when)
- [ ] **Two-factor authentication (2FA)** — for admin accounts at minimum
- [ ] **Data backup system** — automated database backups scheduled
- [ ] **GDPR/Privacy compliance** — if serving EU customers: cookie consent, data export, right to delete
- [ ] **Maintenance mode** — toggle to take site offline during deployments without showing errors
- [ ] **Sitemap.xml and robots.txt** — for SEO
- [ ] **404 and 500 error pages** — custom branded error pages exist

---

## 📋 PHASE 19 — PERFORMANCE & SCALABILITY

- [ ] All images are compressed and served in modern format (WebP)
- [ ] Images have lazy loading
- [ ] API responses are paginated — no endpoint returns unbounded list of records
- [ ] Heavy queries are cached where appropriate
- [ ] No blocking operations on the main thread
- [ ] Lighthouse score check: run on homepage, equipment listing page, and booking page — report scores for Performance, Accessibility, Best Practices, SEO
- [ ] Mobile responsiveness: verify all pages work on 375px, 768px, 1024px, 1440px screen widths
- [ ] Fonts load correctly — no FOUT (Flash of Unstyled Text)
- [ ] Arabic RTL layout doesn't break on mobile

---

## 📋 PHASE 20 — FINAL READINESS CHECKLIST

Before going live, confirm all of the following:

- [ ] All environment variables set for production (not dev/test values)
- [ ] Payment gateway switched from sandbox to live mode
- [ ] Email service configured with production domain and DKIM/SPF records
- [ ] SSL certificate installed and auto-renewing
- [ ] Domain pointing to correct server
- [ ] Database backups configured and tested
- [ ] Error monitoring set up (Sentry or equivalent)
- [ ] Logging configured (server logs, API logs)
- [ ] Rate limiting active on all public endpoints
- [ ] Admin accounts have strong passwords and 2FA enabled
- [ ] All test/demo data removed from the database
- [ ] robots.txt correctly configured (not blocking search engines)
- [ ] Favicon and Open Graph meta tags set
- [ ] Privacy Policy and Terms of Service pages exist and are linked in footer
- [ ] Cookie consent banner (if applicable)
- [ ] Contact page / support email is working
- [ ] 404 page is branded and links back to homepage

---

## 📊 OUTPUT FORMAT

After completing all phases, produce the following:

### 1. EXECUTIVE SUMMARY
- Total issues found: [number]
- Critical issues: [number] — MUST fix before launch
- High issues: [number] — Should fix before launch
- Medium issues: [number] — Fix within first week post-launch
- Low / Info: [number] — Fix when time allows

### 2. MISSING FEATURES LIST
A prioritized list of features that don't exist yet and should be built.

### 3. FULL ISSUE LOG
A table with every issue:
| # | Phase | Severity | File:Line | Issue Description | Recommended Fix |
|---|-------|----------|-----------|-------------------|-----------------|

### 4. LAUNCH READINESS VERDICT
**READY / NOT READY** — with a list of the blocking items that must be resolved before going live.

---

*This audit was generated for a Camera Rental & Studio Booking website pre-production review.*
*Audit covers: Code Quality, Security, Database, Rental Module, Studio Module, Booking Flow, Invoicing & سند الأمر, Control Panel, API Management, Multilingual (AR/EN/ZH), Warehouse Barcode Scanning, AI Chatbot, Excel Import/Export, Notifications, Payments, Duplications, Missing Features, Performance, and Launch Readiness.*
