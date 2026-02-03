# 🧠 المواصفات النهائية الشاملة للوحة التحكم (100% Production‑Ready)

**الهدف:** هذا الملف هو المرجع النهائي والوحيد لتسليم لوحة تحكم كاملة بدون فجوات، بدون صفحات وهمية، وبجاهزية إنتاجية تامة وكأنها نتاج شركة متخصصة بخبرة 50 سنة.

**التاريخ:** 2026-01-30  
**المصدر:** دمج وتحليل شامل لكل ملفات المواصفات والتدقيق والكود الحالي.

---

## 0) المبادئ الذهبية (غير قابلة للتفاوض)

1) **لا توجد صفحة وهمية** (0% Mock/Placeholder).  
2) **لا يوجد رابط ميت** في أي مكان.  
3) **كل صفحة لها وظيفة واضحة + بيانات حقيقية + أزرار تعمل**.  
4) **صلاحيات وأمن شامل** (RBAC + Audit Log).  
5) **قوائم احترافية** (Pagination, Filters, Bulk Actions, Export).  
6) **تقارير مالية قابلة للتصدير**.  
7) **التقويم + التوافر** يعملان بشكل كامل.  
8) **العمليات التشغيلية (Warehouse/Delivery/Maintenance)** مكتملة end‑to‑end.  

---

## 1) متطلبات النظام الشاملة (System‑Wide Requirements)

### 1.1 الأمان والصلاحيات
- RBAC كامل (Roles & Permissions CRUD)
- Permission Matrix per module + Audit Trail
- MFA للعمليات الحساسة (Refunds / Approval / Force Transition)
- IP restrictions (اختياري) + Rate limiting
- Logs لكل تغيّر

### 1.2 الأداء
- Pagination & Filtering لكل list page
- Caching للتقارير والـ KPIs
- Jobs/Queues للعمليات الثقيلة (exports, reports, AI batch)
- Indexing للـ DB

### 1.3 الخبرة (UX)
- RTL عربي أولاً + English
- Global Search في الهيدر (Bookings, Clients, Equipment)
- Bulk Actions + Export لكل جداول الأعمال
- Empty States ذكية مع CTA
- Last Updated + Refresh
- Saved Filters/View presets

---

## 2) كتالوج الصفحات (Page Catalog) – كل صفحة يجب أن تكون Live

### ✅ صفحات رئيسية + فرعية (لا استثناء)

**Command Center:**
- /admin/dashboard
- /admin/dashboard/overview
- /admin/dashboard/revenue
- /admin/dashboard/activity
- /admin/dashboard/recent-bookings
- /admin/dashboard/quick-actions

**Action Center & Ops:**
- /admin/action-center
- /admin/approvals
- /admin/live-ops

**Booking Engine:**
- /admin/quotes
- /admin/quotes/new
- /admin/quotes/[id]
- /admin/quotes/[id]/edit
- /admin/bookings
- /admin/bookings/new
- /admin/bookings/[id]
- /admin/calendar
- /admin/change-requests
- /admin/extensions
- /admin/availability

**Inventory & Assets:**
- /admin/inventory
- /admin/inventory/equipment
- /admin/inventory/equipment/new
- /admin/inventory/equipment/[id]
- /admin/inventory/equipment/[id]/edit
- /admin/inventory/categories
- /admin/inventory/brands
- /admin/inventory/import
- /admin/inventory/products
- /admin/inventory/products/[id]/review

**Studios:**
- /admin/studios
- /admin/studios/new
- /admin/studios/[id]
- /admin/studios/[id]/edit
- /admin/studios/packages
- /admin/studios/add-ons

**Operations:**
- /admin/ops/warehouse
- /admin/ops/warehouse/check-out
- /admin/ops/warehouse/check-in
- /admin/ops/warehouse/inventory
- /admin/ops/delivery
- /admin/ops/delivery/schedule
- /admin/technicians
- /admin/maintenance
- /admin/maintenance/new
- /admin/maintenance/[id]

**Finance & Legal:**
- /admin/invoices
- /admin/invoices/new
- /admin/invoices/[id]
- /admin/payments
- /admin/payments/[id]
- /admin/refunds
- /admin/contracts
- /admin/contracts/[id]
- /admin/finance
- /admin/finance/reports

**CRM & Marketing:**
- /admin/clients
- /admin/clients/new
- /admin/clients/[id]
- /admin/coupons
- /admin/coupons/new
- /admin/coupons/[id]
- /admin/offers
- /admin/packages
- /admin/bundles
- /admin/marketing
- /admin/marketing/campaigns/new
- /admin/marketing/campaigns/[id]
- /admin/recommendations
- /admin/compatibility

**AI & Pricing:**
- /admin/ai
- /admin/kit-builder
- /admin/dynamic-pricing

**Settings & System:**
- /admin/settings
- /admin/settings/integrations
- /admin/settings/features
- /admin/settings/roles
- /admin/settings/roles/[id]
- /admin/settings/ai-control
- /admin/settings/availability-rules
- /admin/settings/notifications
- /admin/settings/audit-log
- /admin/notifications
- /admin/profile
- /admin/super

---

## 3) مواصفات الصفحات بالتفصيل (Page‑by‑Page)

### 3.1 Dashboard (الصفحات الستة)

#### /admin/dashboard
**المطلوب:**
- Date range + Comparison
- KPI cards (Revenue, Bookings, Occupancy, New Clients)
- Charts (Revenue trend, Booking status)
- Alerts widget
- Quick actions
- Drill‑down links

**الأزرار:** New Booking, New Quote, Add Equipment, View Calendar, Export

---

#### /admin/dashboard/overview
**المطلوب:**
- Widget system قابل للسحب والإفلات
- حفظ Layout لكل مستخدم
- إضافة Widgets جديدة

---

#### /admin/dashboard/revenue
**المطلوب:**
- Revenue analytics (filters, breakdowns, charts, export)

---

#### /admin/dashboard/activity
**المطلوب:**
- Activity Feed + realtime updates
- Filters + Search + Export

---

#### /admin/dashboard/recent-bookings
**المطلوب:**
- Table متقدم للحجوزات الأخيرة
- Bulk actions + Export

---

#### /admin/dashboard/quick-actions
**المطلوب:**
- Command Center للأوامر السريعة
- Favorites + Command Palette (Ctrl+K)

---

### 3.2 Action Center & Approvals

#### /admin/action-center
- قائمة alerts + tasks
- SLA + assignment + escalation
- Actions: retry payment, contact client, schedule maintenance

#### /admin/approvals
- workflows لموافقات (discount/refund/overbooking)
- audit + SLA + notes

#### /admin/live-ops
- operations dashboard + timeline + map

---

### 3.3 Booking Engine

#### /admin/quotes (List)
- columns: number, client, status, dates, total, valid until
- filters + search + export
- bulk actions: send, convert, cancel

#### /admin/quotes/new
- wizard كامل (Client → Items → Pricing → Terms → Review)
- preview PDF + send

#### /admin/quotes/[id]
- تفاصيل + إرسال + convert + revision history

#### /admin/bookings (List)
- columns: number, client, status, dates, total, payment
- filters + bulk actions

#### /admin/bookings/new
- availability check + quantity per equipment
- pricing preview

#### /admin/bookings/[id]
- tabs: summary, equipment, schedule, delivery, returns, payments, invoices, contracts, audit

#### /admin/calendar
- full interactive calendar (day/week/month/timeline)

#### /admin/change-requests
- approval workflow لتعديلات الحجوزات

#### /admin/extensions
- تمديد الحجوزات مع availability check

#### /admin/availability
- realtime availability + blocking

---

### 3.4 Inventory & Assets

#### /admin/inventory/equipment (List)
- filters: category, brand, condition, availability
- bulk edit + export

#### /admin/inventory/equipment/new
- form كامل + translations + media + SEO

#### /admin/inventory/equipment/[id]
- details + history + maintenance

#### /admin/inventory/categories + brands
- CRUD كامل + hierarchy + stats

#### /admin/inventory/import
- import + validation + history + rollback

#### /admin/inventory/products
- قائمة المنتجات لمراجعة AI

---

### 3.5 Studios Management

#### /admin/studios
- إدارة الاستوديوهات كاملة (location, pricing, availability, media, policies)

#### /admin/studios/packages
- إدارة باقات الاستوديو (podcast/product/portrait)

#### /admin/studios/add-ons
- خدمات إضافية + analytics

---

### 3.6 Operations

#### /admin/ops/warehouse
- queues + KPIs + actions

#### /admin/ops/warehouse/check-out
- workflow كامل مع scan + checklist + receipt

#### /admin/ops/warehouse/check-in
- inspection + damage + settlement

#### /admin/ops/warehouse/inventory
- inventory adjustments + tracking

#### /admin/ops/delivery
- deliveries list + status + driver assignment

#### /admin/ops/delivery/schedule
- route planning + scheduling

#### /admin/technicians
- CRUD + scheduling + workload

#### /admin/maintenance
- maintenance list + work orders + schedule

---

### 3.7 Finance & Legal

#### /admin/invoices
- full CRUD + PDF + email + aging

#### /admin/payments
- payment detail + retry + refund

#### /admin/refunds
- refund workflow + approvals

#### /admin/contracts
- contract detail + signature

#### /admin/finance/reports
- charts + export + schedule

---

### 3.8 CRM & Marketing

#### /admin/clients
- CRUD + history + segmentation

#### /admin/coupons
- CRUD + analytics

#### /admin/offers + packages + bundles
- offers + pricing rules

#### /admin/marketing
- campaigns + tracking

#### /admin/recommendations
- AI + rules + analytics

#### /admin/compatibility
- equipment compatibility matrix

---

### 3.9 AI & Pricing

#### /admin/ai
- KPIs + job history

#### /admin/dynamic-pricing
- dynamic pricing engine + simulation

---

### 3.10 Settings & System

#### /admin/settings/roles
- CRUD + permission matrix

#### /admin/settings/notifications
- templates + channels

#### /admin/settings/audit-log
- logs لكل العمليات

---

# ✅ هذا الملف هو المرجع النهائي لتسليم لوحة تحكم كاملة بلا فجوات.
