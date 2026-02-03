admin_panel_complete_specification_part1# Control Panel (Sidebar) Deep Dive Audit

Date: 2026-01-28
Scope: Pages linked from `src/components/layouts/admin-sidebar.tsx`.

## High-level summary
- Missing routes: `/admin/action-center`, `/admin/approvals`, `/admin/live-ops`, `/admin/kit-builder`, `/admin/dynamic-pricing`, `/admin/ai-recommendations`, `/admin/inventory/brands`.
- Placeholder/mock data pages: `/admin/calendar`, `/admin/inventory/categories`, `/admin/studios`, `/admin/technicians`, `/admin/settings/roles`.
- KPI-heavy pages: `/admin/dashboard` (real DB KPIs), `/admin/ops/warehouse` (counts only), `/admin/finance/reports` (revenue KPIs only), `/admin/settings/ai-control` (AI analytics KPIs).
- Most list pages lack: summary KPIs, advanced filters, bulk actions, export, and deeper insights.

Legend:
- STATUS: IMPLEMENTED | PLACEHOLDER | MISSING
- DATA: LIVE (API/DB) | MOCK | NONE

---

## 1) Command Center

### /admin/dashboard (Dashboard)
- STATUS: IMPLEMENTED
- DATA: LIVE (Prisma queries for KPIs, revenue series, booking state, recent bookings)
- Current content/features:
  - KPI cards: revenue (month), bookings (month), utilization, new clients
  - Revenue chart (last 30 days) and booking state distribution
  - Recent bookings table
  - Quick actions: new booking, new quote
- KPIs present: revenue, booking count, utilization %, new clients
- Missing:
  - Date range selector and period comparison (MoM/YoY)
  - Segmentation: by category/brand/city/channel
  - Alerts for anomalies (failed payments, overdue returns, low stock)
  - Operational KPIs (on-time delivery %, overdue maintenance, refund rate)
  - Drill-down from charts into lists
- To make it pop:
  - Add a global date filter + comparison badges
  - Add a "Today" ops strip (active rentals, returns due, deliveries in transit)
  - Add insights cards (e.g., "Top 5 revenue items", "At-risk bookings")
  - Add quick links to Action Center and Live Ops panels

### /admin/action-center
- STATUS: MISSING
- DATA: NONE
- Missing:
  - Entire page and route
- To make it pop:
  - A prioritized task inbox: approvals, overdue invoices, risk flags, low-stock alerts
  - SLA timers and owner assignment
  - One-click actions (approve/reject, notify customer, create task)

### /admin/approvals
- STATUS: MISSING
- DATA: NONE (APIs exist under `/api/approvals/...`)
- Missing:
  - Entire UI for pending approvals
- To make it pop:
  - Approval queue with context (who/what/why), inline compare, audit trail
  - Bulk approve/reject with reasons
  - Filters by type (discount override, feature flag, refund, etc.)

### /admin/live-ops
- STATUS: MISSING
- DATA: NONE
- Missing:
  - Real-time operations view
- To make it pop:
  - Live board with active bookings, deliveries, check-outs/returns
  - Map of in-transit deliveries with ETAs
  - Live equipment availability and exceptions

---

## 2) Booking Engine

### /admin/quotes
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/quotes`)
- Current content/features:
  - List view, search, status filter
  - Convert quote to booking action
- KPIs present: none
- Missing:
  - Pipeline KPIs (total value, win rate, average cycle time)
  - Aging and expiry warnings summary
  - Bulk actions and export
- To make it pop:
  - Add KPI strip (pipeline value, conversion rate, expiring in 7 days)
  - Add stage funnel chart
  - Add quick templates and follow-up reminders

### /admin/bookings
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/bookings`)
- Current content/features:
  - List view with status filter, search, key booking fields
- KPIs present: none
- Missing:
  - Summary KPIs (active, upcoming, overdue returns, at-risk)
  - Calendar/availability overlay
  - Payment status and check-in/out progress
- To make it pop:
  - Add a KPI strip + status swimlanes
  - Add booking health flags (payment pending, risk, missing docs)
  - Add quick actions (check-out, collect payment, extend)

### /admin/calendar
- STATUS: PLACEHOLDER
- DATA: MOCK (`mockBookings`)
- Current content/features:
  - Simple list of upcoming bookings + empty calendar placeholder
- KPIs present: none
- Missing:
  - Real calendar (month/week/day) and resource view
  - Drag-and-drop rescheduling and conflict detection
  - Real data and filters
- To make it pop:
  - Add equipment/resource timeline view + availability heatmap
  - Add conflict alerts and reschedule suggestions

---

## 3) Smart Sales Tools

### /admin/ai
- STATUS: IMPLEMENTED
- DATA: LIVE (AI API endpoints)
- Current content/features:
  - Tabs: Risk Assessment, Kit Builder, Pricing, Demand Forecast, Chatbot
  - Manual input forms and output cards
- KPIs present: none
- Missing:
  - Usage analytics (jobs, success rate, cost)
  - Saved recommendations, history, and approvals
  - Connect to actual entities (search/select equipment by name)
- To make it pop:
  - Add usage KPIs and recent AI outputs
  - Add "Apply to booking" actions and approval workflows
  - Provide drop-down selectors and templates to reduce manual IDs

### /admin/kit-builder
- STATUS: MISSING
- DATA: NONE (functionality exists inside /admin/ai tab)
- Missing:
  - Dedicated page or redirect
- To make it pop:
  - Dedicated UI with preset scenarios and saved kits
  - Integrate with quote creation

### /admin/dynamic-pricing
- STATUS: MISSING
- DATA: NONE
- Missing:
  - Dedicated page
- To make it pop:
  - Pricing dashboard: utilization curve, competitor benchmark, rule-based pricing
  - One-click apply + A/B pricing tests

### /admin/ai-recommendations
- STATUS: MISSING
- DATA: NONE
- Missing:
  - Dedicated page
- To make it pop:
  - Cross-sell/upsell recommendations with expected lift
  - "Add to quote" actions and learn-from-acceptance loop

---

## 4) Inventory & Assets

### /admin/inventory/equipment
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/equipment`)
- Current content/features:
  - Filters (search, category, condition, active), list view, actions
- KPIs present: none
- Missing:
  - Inventory KPIs (utilization, availability %, items in maintenance)
  - Bulk actions (activate/deactivate, price update)
  - Advanced filters (brand, location, price range)
- To make it pop:
  - Add a KPI strip and a stock risk badge
  - Add “availability next 7 days” mini chart per item
  - Add bulk edit and export

### /admin/inventory/categories
- STATUS: PLACEHOLDER
- DATA: MOCK (`mockCategories`)
- Current content/features:
  - Static list, add/edit/delete buttons (non-functional)
- KPIs present: none
- Missing:
  - Real CRUD, category hierarchy, usage analytics
- To make it pop:
  - Add category KPIs: revenue, utilization, margin
  - Add drag-and-drop hierarchy management

### /admin/inventory/brands
- STATUS: MISSING
- DATA: NONE
- Missing:
  - Entire page
- To make it pop:
  - Brand performance KPIs and maintenance rates
  - Brand catalog with linked equipment

### /admin/studios
- STATUS: PLACEHOLDER
- DATA: MOCK (in-file array)
- Current content/features:
  - Basic list with status, rate, capacity
- KPIs present: none
- Missing:
  - Real data, scheduling, availability, booking integration
- To make it pop:
  - Add studio utilization charts and revenue per studio
  - Add calendar view and quick booking creation

### /admin/inventory/import
- STATUS: IMPLEMENTED
- DATA: LIVE (import APIs)
- Current content/features:
  - Excel parsing, mapping, validation, AI preview, progress tracking
- KPIs present: none
- Missing:
  - Import history summary and rollback tools
  - Saved mappings/templates
  - Duplicate detection and merge suggestions
- To make it pop:
  - Add import success KPIs and error heatmap
  - Add “preview impact” diff (new vs updated)

---

## 5) Field Operations

### /admin/ops/warehouse
- STATUS: IMPLEMENTED
- DATA: LIVE (check-in/out queues)
- Current content/features:
  - Queue counts, quick actions, lists for check-out and check-in
- KPIs present: ready for check-out, ready for return (counts)
- Missing:
  - Real inventory KPIs and SLA timers
  - Pick/pack lists, barcode scanning, damage logging
- To make it pop:
  - Add queue aging indicators and SLA breach alerts
  - Add scan-based flow and exception capture

### /admin/ops/delivery
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/delivery`)
- Current content/features:
  - Delivery list, status filters, status transitions
- KPIs present: none
- Missing:
  - Driver assignment, route planning, ETA and proof of delivery
  - Map view and delivery timeline
- To make it pop:
  - Add map + route sequencing suggestions
  - Add KPI strip (on-time %, failed, in-transit)

### /admin/technicians
- STATUS: PLACEHOLDER
- DATA: MOCK (in-file array)
- Current content/features:
  - Basic list and filters
- KPIs present: none
- Missing:
  - Real data, skill matrix, workload, scheduling
- To make it pop:
  - Add utilization and SLA KPIs
  - Add technician calendar and job assignment drag/drop

### /admin/maintenance
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/maintenance`)
- Current content/features:
  - Filters for status/type/priority, list with assignments
- KPIs present: none
- Missing:
  - Summary KPIs (overdue count, MTTR, upcoming PM)
  - Asset history and parts usage
- To make it pop:
  - Add maintenance dashboard cards and trend chart
  - Add condition-based alerts and cost impact

---

## 6) Finance & Legal

### /admin/invoices
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/invoices`)
- Current content/features:
  - Filters by status/type, list with amounts
- KPIs present: none
- Missing:
  - Summary KPIs (overdue total, aging buckets)
  - Bulk actions, reminders, export
- To make it pop:
  - Add aging chart and auto-reminder queue
  - Add inline pay/collect actions

### /admin/payments
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/payments`)
- Current content/features:
  - Status filter, list with refund info
- KPIs present: none
- Missing:
  - Reconciliation tools and date range filter
  - Retry/chargeback management
- To make it pop:
  - Add KPIs (success rate, refund rate, failed amount)
  - Add payment gateway drill-down and export

### /admin/contracts
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/contracts`)
- Current content/features:
  - Status filter, list, signed status
- KPIs present: none
- Missing:
  - Template management, expiring soon alerts
  - E-sign flow and audit
- To make it pop:
  - Add signing funnel KPIs and reminders
  - Add document preview and send/resend

### /admin/finance/reports
- STATUS: IMPLEMENTED (PARTIAL)
- DATA: LIVE (`/api/reports/...`)
- Current content/features:
  - Report type selector, date range, revenue summary cards
  - Report details shown as raw JSON
- KPIs present: revenue KPIs only
- Missing:
  - Charts for all report types
  - Export feature (placeholder) and saved reports
- To make it pop:
  - Add visualization per report type (line/bar/pie)
  - Add scheduled email reports and CSV/PDF export

---

## 7) CRM & Marketing

### /admin/clients
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/clients`)
- Current content/features:
  - Filters by status/search, list with spend and last booking
- KPIs present: none
- Missing:
  - Customer segmentation, LTV, churn risk
  - Communication history and notes
- To make it pop:
  - Add client health score and RFM segments
  - Add quick actions (message, create quote)

### /admin/coupons
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/coupons`)
- Current content/features:
  - Filters, list, usage stats
- KPIs present: none
- Missing:
  - Performance analytics (revenue lift, ROI)
  - Audience targeting and distribution
- To make it pop:
  - Add coupon performance dashboard
  - Add segments and auto-expiry rules

### /admin/marketing
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/marketing/campaigns`)
- Current content/features:
  - Filters, list, campaign stats (sent)
- KPIs present: none
- Missing:
  - Open/click/conversion analytics
  - Template builder and automation flows
- To make it pop:
  - Add campaign performance charts and A/B tests
  - Add audience builder and scheduled workflows

---

## 8) Settings

### /admin/settings
- STATUS: IMPLEMENTED (NAV ONLY)
- DATA: NONE
- Current content/features:
  - Links to integrations, feature flags, roles
- KPIs present: none
- Missing:
  - General settings (company profile, taxes, policies)
- To make it pop:
  - Add core system settings and branding
  - Add system health overview

### /admin/settings/integrations
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/integrations`)
- Current content/features:
  - Tabs for payments/email/whatsapp/analytics/webhooks
  - Config save, test connection
- KPIs present: none
- Missing:
  - Integration logs, webhook event viewer
  - Environment separation and secret masking flow
- To make it pop:
  - Add health status and uptime metrics
  - Add event replay and error diagnostics

### /admin/settings/features
- STATUS: IMPLEMENTED
- DATA: LIVE (`/api/feature-flags`)
- Current content/features:
  - Feature flags with scopes, approvals, audit trail
- KPIs present: none
- Missing:
  - Percentage rollouts and targeting rules
  - Scheduled enable/disable and owner fields
- To make it pop:
  - Add rollout controls and change impact preview
  - Add usage metrics per feature flag

### /admin/settings/roles
- STATUS: PLACEHOLDER
- DATA: MOCK (in-file array)
- Current content/features:
  - Static list of roles
- KPIs present: none
- Missing:
  - Real role CRUD, permission matrix, audit
- To make it pop:
  - Add permission grid with search and bulk updates
  - Add role-based access report and change history

### /admin/settings/ai-control
- STATUS: IMPLEMENTED (PARTIAL)
- DATA: LIVE (`/api/admin/settings/ai`, `/api/admin/ai/analytics`)
- Current content/features:
  - Provider settings, analytics KPIs, placeholder job history
- KPIs present: jobs, success rate, processed items, total cost
- Missing:
  - Job history list and failure diagnostics
  - Budget limits and alerts
- To make it pop:
  - Add cost trends, per-feature breakdown, and alerts
  - Add job queue visibility and retry controls

---

## Cross-cutting gaps (applies to many pages)
- No consistent KPI strip across list pages
- Limited pagination, sorting, and export
- Few bulk actions and workflow shortcuts
- Missing audit/context panels on operational pages
- No global filters (date range, location, business unit)

## Quick wins (high impact, low effort)
- Add a shared KPI strip component for list pages
- Add export (CSV) and saved filters
- Add "last updated" timestamps and refresh buttons
- Add consistent empty states with recommended next actions

