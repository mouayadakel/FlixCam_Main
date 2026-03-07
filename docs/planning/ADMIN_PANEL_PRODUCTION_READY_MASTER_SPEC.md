# ✅ مواصفات موحّدة وشاملة لإكمال لوحة التحكم 100% (Production‑Ready)

**المشروع:** FlixCam.rent – Admin Panel  
**التاريخ:** 2026-01-30  
**الغرض:** دمج جميع المستندات السابقة في ملف واحد نهائي، مع **تحليل كامل لكل النواقص** وتحويل النظام إلى لوحة تحكم جاهزة للإنتاج دون صفحات وهمية أو روابط ميتة.

---

## 1) المصادر المدمجة

تم دمج وتحليل المحتوى من:

- `admin_panel_complete_specification_part1.md` (Dashboard & Analytics)
- `admin_panel_complete_specification_part2.md` (Action Center & Approvals)
- `admin_panel_complete_specification_part3.md` (Booking Engine & AI)
- `admin_panel_complete_specification_part4.md` (Studios, Packages, Warehouse)
- `ADMIN_PANEL_COMPLETE_SPECIFICATION_FULL.md` (غير مكتمل لكنه مفيد)
- `ADMIN_PANEL_EXECUTIVE_SUMMARY.md`
- `CONTROL_PANEL_FULL_AUDIT_DETAILED.md`
- مراجعة الكود الحالي تحت `src/app/admin`

**ملفات مذكورة من المستخدم وغير موجودة داخل المستودع:**

- `equipment_rental_user_stories_use_cases_diagrams.md`
- `studio_booking_user_stories_use_cases_state_machine_test_cases.md`
- `equipment_booking_user_stories_use_cases_state_machine_test_cases.md`
- `master_booking_system_full_specification.md`
- `frontend_ux_map_public_website.md`

> عند توفرها لاحقاً يجب إضافتها لهذا المستند فوراً.

---

## 2) الوضع الحالي بالأرقام (Current State)

- **Live صفحات:** ~25 (≈33%)
- **Mock/Placeholder:** ~15 (≈20%)
- **Missing صفحات:** ~35 (≈47%)
- **APIs مكتملة:** ~40%
- **الجاهزية الإنتاجية:** منخفضة – النظام بحالة MVP فقط

**المشكلة الأساسية:**

- روابط كثيرة تؤدي لصفحات غير موجودة.
- صفحات كثيرة تعمل ببيانات وهمية.
- غياب عمليات تشغيل حرجة (Calendar, Warehouse, Invoices, Roles).

---

## 3) مبادئ الإنتاج (Non‑Functional Requirements)

### 3.1 الأمان والصلاحيات (Security / RBAC)

- Roles & Permissions **حقيقي** (CRUD + Matrix + Audit)
- Audit Trail لكل العمليات الحساسة (تغيير أسعار، حذف، Refunds, Approvals)
- حماية العمليات الحرجة (Confirm + MFA عند الحاجة)
- Rate Limiting لكل API
- Logs & Monitoring

### 3.2 الأداء (Performance)

- Pagination + Server‑side filters لكل القوائم
- Caching للـ Dashboards والتقارير
- Jobs/Queue للعمليات الثقيلة (exports/reports)
- Indexing للـ DB للجداول الثقيلة

### 3.3 تجربة المستخدم (UX)

- Global Search في الهيدر
- Bulk Actions في كل صفحة قائمة
- Export CSV/Excel/PDF
- Saved Filters & Views
- Empty States واضحة مع CTA
- Last Updated + Refresh

---

# القسم A: Dashboard & Analytics (كامل)

## A1) `/admin/dashboard`

**موجود حالياً** لكن ناقص بشدة.

**المطلوب:**

- Date Range Selector + Compare (Previous Period/Year)
- KPIs حقيقية (Revenue, Bookings, Occupancy, New Clients)
- Breakdown للإيراد (Equipment/Studio/Packages/Add‑ons)
- Alerts Widget (Payments failed, Low Stock, Late Returns…)
- Quick Actions قابلة للتخصيص
- Drill‑down لكل KPI/Chart

**نواقص حالية:** المقارنات hardcoded، عدم وجود Alerts، لا يوجد فلاتر زمنية.

---

## A2) `/admin/dashboard/overview`

**حالياً Placeholder** → يجب تحويلها إلى Widgets Dashboard قابلة للتخصيص مع drag & drop.

---

## A3) `/admin/dashboard/revenue`

تحليلات متقدمة للإيرادات (charts + tables + insights + export/schedule).

---

## A4) `/admin/dashboard/activity`

Activity Feed كامل مع real‑time updates + filters + export.

---

## A5) `/admin/dashboard/recent-bookings`

قائمة متقدمة للحجوزات الحديثة مع bulk actions و KPIs.

---

## A6) `/admin/dashboard/quick-actions`

Command Center للأوامر السريعة + favorites + command palette.

---

# القسم B: Action Center & Approvals

## B1) `/admin/action-center`

- مركز المهام الحرجة (Alerts/Tasks/Approvals)
- SLA Tracking + assignment + escalation
- إجراءات مباشرة (Retry payment, Contact client…)

## B2) `/admin/approvals`

- خصومات/Refunds/Overbooking/Manual booking approvals
- تفاصيل مالية + justification + SLA + Audit

## B3) `/admin/live-ops`

- Real‑time operations dashboard
- Timeline + Map + queues

---

# القسم C: Booking Engine (Quotes, Bookings, Calendar)

## C1) `/admin/quotes`

- KPI strip + bulk actions + export

## C2) `/admin/quotes/new`

- Wizard كامل (Client → Items → Pricing → Terms → Review)
- PDF + إرسال عبر Email/WhatsApp

## C3) `/admin/quotes/[id]`

- PDF, Send/Resend, Version history, Revisions

## C4) `/admin/bookings`

- Filters متقدمة + bulk actions

## C5) `/admin/bookings/new`

- Availability check حقيقي + اختيار كميات
- Pricing preview

## C6) `/admin/bookings/[id]`

- Tabs تعمل بالكامل (Delivery/Returns/Audit)
- Change Request, Extension, Refund actions

## C7) `/admin/calendar`

- Calendar كامل (Day/Week/Month/Timeline)
- Drag & Drop + conflict detection

## C8) `/admin/change-requests` + `/admin/extensions`

- Workflow كامل مع approvals والرسائل

## C9) `/admin/availability`

- لوحة توافر المعدات والاستوديوهات + rules

---

# القسم D: Inventory & Assets

## D1) `/admin/inventory`

- KPIs + روابط

## D2) `/admin/inventory/equipment`

- Filters متقدمة + bulk edit + export

## D3) `/admin/inventory/equipment/new`

- تحقق شروط الكمية + availability

## D4) `/admin/inventory/equipment/[id]`

- Usage history + maintenance history

## D5) `/admin/inventory/categories` + `/admin/inventory/brands`

- CRUD حقيقي + hierarchy + stats

## D6) `/admin/inventory/import`

- Import history + rollback

## D7) `/admin/inventory/products`

- قائمة المنتجات التي تحتاج AI review

---

# القسم E: Studios Management (part4 كامل)

## E1) `/admin/studios`

- تحويل كامل من Mock إلى Live (نموذج شامل للتفاصيل، التسعير، الأوقات، السياسات)

## E2) `/admin/studios/packages`

- إدارة باقات الاستوديو (Podcast/Product/Portrait)

## E3) `/admin/studios/add-ons`

- إدارة الخدمات الإضافية + analytics

---

# القسم F: Operations

## F1) `/admin/ops/warehouse`

- Queue + KPIs + Quick Actions

## F2) `/admin/ops/warehouse/check-out`

- عملية إخراج كاملة (scan + checklist + receipt)

## F3) `/admin/ops/warehouse/check-in`

- فحص عودة + damage assessment + settlement

## F4) `/admin/ops/delivery`

- قائمة + driver assignment

## F5) `/admin/ops/delivery/schedule`

- جدول تسليم + route planning

## F6) `/admin/maintenance`

- workflows + preventive schedule

---

# القسم G: Finance & Legal

## G1) `/admin/invoices`

- CRUD كامل + PDF + Email + Aging

## G2) `/admin/payments`

- تفاصيل + refunds + retry

## G3) `/admin/refunds`

- refunds management + approvals

## G4) `/admin/contracts`

- تفاصيل + توقيع إلكتروني

## G5) `/admin/finance/reports`

- charts + export + schedule

---

# القسم H: CRM & Marketing

## H1) `/admin/clients`

- CRUD + history + segmentation

## H2) `/admin/coupons`

- CRUD + analytics + usage

## H3) `/admin/offers` / `/admin/packages` / `/admin/bundles`

- إدارة العروض والباقات والخصومات

## H4) `/admin/marketing`

- إنشاء حملات + تقارير open/click/conversion

## H5) `/admin/recommendations` / `/admin/compatibility`

- Recommendation rules + compatibility matrix

---

# القسم I: AI & Pricing

## I1) `/admin/ai`

- إضافة KPIs usage + history

## I2) `/admin/dynamic-pricing`

- نظام تسعير ديناميكي كامل

## I3) `/admin/kit-builder`

- صفحة مستقلة أو redirect واضح

---

# القسم J: Settings & Security

## J1) `/admin/settings`

- إعدادات عامة (VAT, Currency, Branding)

## J2) `/admin/settings/integrations`

- Logs + env separation

## J3) `/admin/settings/features`

- Rollouts + targeting

## J4) `/admin/settings/roles`

- CRUD حقيقي + matrix

## J5) `/admin/settings/ai-control`

- Job history + budget alerts

## J6) `/admin/settings/availability-rules`

- buffer + blackout + min/max durations

## J7) `/admin/settings/notifications`

- قنوات + templates + schedules

## J8) `/admin/settings/audit-log`

- سجل شامل لكل الأحداث

---

# القسم K: System Pages

## K1) `/admin/notifications`

- مركز إشعارات داخلي

## K2) `/admin/profile`

- ملف المستخدم + أمن الحساب

---

## 4) تعريف النجاح (Definition of Done)

- 0 صفحات مفقودة
- 0 صفحات Mock/Placeholder
- كل القوائم تعمل على بيانات حقيقية
- RBAC + Audit Trail كامل
- تقارير مالية قابلة للتصدير
- Calendar + Availability حقيقي
- Warehouse + Delivery workflow مكتمل

---

# ✅ هذا المستند هو المرجع النهائي للوصول إلى Production‑Ready 100%
