# ✅ المواصفات الشاملة لإكمال لوحة التحكم (Production‑Ready)

**الهدف:** تحويل لوحة التحكم الحالية إلى نظام إنتاجي مكتمل 100% — بدون صفحات وهمية، بدون روابط ميتة، مع تغطية كاملة لكل التدفقات (Booking, Inventory, Studio, Operations, Finance, CRM, AI, Settings).

**تاريخ التحديث:** 2026-01-30  
**النطاق:** كل صفحات `/admin` + أي صفحات فرعية مرتبطة بها في الواجهة أو الـ Sidebar.  

---

## 0) مصادر هذا المستند
**تم الاعتماد على:**
- `docs/planning/admin_panel_complete_specification_part1.md`
- `docs/planning/admin_panel_complete_specification_part2.md`
- `docs/planning/admin_panel_complete_specification_part3.md`
- `docs/planning/ADMIN_PANEL_COMPLETE_SPECIFICATION_FULL.md` (ملف غير مكتمل لكنه مفيد)
- `CONTROL_PANEL_FULL_AUDIT_DETAILED.md` (تدقيق كامل للوضع الحالي)
- مراجعة شاملة لهيكل الصفحات في `src/app/admin`

**ملفات مذكورة من المستخدم لكنها غير موجودة في المستودع:**
- `equipment_rental_user_stories_use_cases_diagrams.md`
- `studio_booking_user_stories_use_cases_state_machine_test_cases.md`
- `equipment_booking_user_stories_use_cases_state_machine_test_cases.md`
- `master_booking_system_full_specification.md`
- `frontend_ux_map_public_website.md`

> ملاحظة: في حال توفر الملفات أعلاه لاحقاً، يجب إدراج متطلباتها في هذا المستند فوراً.

---

## 1) المبادئ العامة (Non‑Functional Requirements)

### 1.1 الأداء والأمان
- كل القوائم الكبيرة **تحتاج Pagination حقيقي + Server‑side filtering**.
- caching على مستوى الـ API (ETag / revalidate) للـ dashboards.
- صلاحيات (RBAC) موحدة في كل API + UI.
- Audit Trail لكل إجراء حساس (تعديل سعر، حذف معدات، موافقات، Refunds).
- حماية العمليات الحساسة (Confirm modal + MFA إن لزم).

### 1.2 الخبرة والواجهة
- RTL Arabic أولاً + دعم English.
- **Global Search** في الهيدر (معدات/حجوزات/عملاء).
- أي صفحة List يجب أن تحتوي على:
  - KPI strip.
  - Filters + Search.
  - Bulk actions.
  - Export CSV/Excel/PDF.
  - Empty State مع CTA واضح.
- **Context sidebar** لروابط فرعية ذكية حسب الصفحة.

### 1.3 النظام ككل
- Notification Center (In‑app + Email + WhatsApp)
- Logs & Audit & System Health
- Permissions UI حقيقي (ليس Mock)
- Real‑time updates حيث يلزم (Action Center, Live Ops, Calendar)

---

## 2) خريطة الصفحات (الحالة الحالية + المطلوب)

### 🔴 صفحات مفقودة يجب تنفيذها (Critical)
- `/admin/action-center`
- `/admin/approvals`
- `/admin/live-ops`
- `/admin/quotes/new`
- `/admin/inventory/brands`
- `/admin/inventory/categories` (CRUD)
- `/admin/ops/warehouse/check-out`
- `/admin/ops/warehouse/check-in`
- `/admin/ops/warehouse/inventory`
- `/admin/ops/delivery/schedule`
- `/admin/invoices/new`
- `/admin/invoices/[id]`
- `/admin/payments/[id]`
- `/admin/contracts/[id]`
- `/admin/clients/new`
- `/admin/clients/[id]`
- `/admin/coupons/new`
- `/admin/coupons/[id]`
- `/admin/marketing/campaigns/new`
- `/admin/marketing/campaigns/[id]`
- `/admin/maintenance/new`
- `/admin/maintenance/[id]`
- `/admin/orders/new`
- `/admin/orders/[id]`
- `/admin/wallet/[id]`
- `/admin/notifications`
- `/admin/profile`

### 🟡 صفحات Mock يجب تحويلها إلى Live
- `/admin/calendar`
- `/admin/inventory/categories`
- `/admin/studios`
- `/admin/technicians`
- `/admin/settings/roles`
- `/admin/users`
- `/admin/finance`
- `/admin/wallet`

---

# القسم A: Command Center (Dashboard & Ops Overview)

## A1) /admin/dashboard (الرئيسي)
**مطلوب:**
- Date Range Selector + مقارنة (Previous Period/Year).
- KPIs ديناميكية (Revenue, Bookings, Occupancy, New Clients).
- Breakdown حقيقي للإيرادات (معدات/استوديو/Packages/Add‑ons).
- Alerts Widget (Failed Payments, Low Stock, Late Returns, Maintenance Due).
- Quick Actions قابلة للتخصيص.
- Drill‑down لكل KPI وChart.

**أزرار أساسية:**
- New Booking, New Quote, Add Equipment, View Calendar.

**نواقص حالية يجب إزالتها:**
- المقارنات hardcoded.

---

## A2) /admin/dashboard/overview
**مطلوب:** صفحة Widgets قابلة للسحب والإفلات + حفظ Layout + Restore Default.

---

## A3) /admin/dashboard/revenue
**مطلوب:** Revenue Analytics كاملة (charts + tables + insights + export).

---

## A4) /admin/dashboard/activity
**مطلوب:** Activity Feed شامل + فلترة + Live updates.

---

## A5) /admin/dashboard/recent-bookings
**مطلوب:** Table متقدم للحجوزات الأخيرة + bulk actions.

---

## A6) /admin/dashboard/quick-actions
**مطلوب:** Command Center للأوامر + Favorites + Command Palette.

---

# القسم B: Action Center & Approvals

## B1) /admin/action-center
- قائمة مهام وتنبيهات حسب الأولوية.
- Filters (priority/type/status/assigned/date).
- SLA tracking + auto‑escalation.
- Actions: approve/reject/retry/contact.

## B2) /admin/approvals
- Approval workflows لكل:
  - Discount, Refund, Overbooking, Manual Booking, Change Request.
- تفاصيل مالية + justification + SLA.
- Audit Trail لكل قرار.

## B3) /admin/live-ops
- Live dashboard (Bookings, Delivery, Warehouse queues, Staff status).
- Timeline + Map (لو فيه GPS).

---

# القسم C: Booking Engine

## C1) /admin/quotes (List)
- KPI strip (pipeline value, win rate, expiring soon).
- Bulk actions (send/remind/export).

## C2) /admin/quotes/new (Wizard)
- 5 خطوات: Client → Items → Pricing → Terms → Review.
- Pricing rules + discounts + approvals.

## C3) /admin/quotes/[id]
- PDF, Send/Resend, Versioning, Revision History.
- Convert to booking + approvals.

## C4) /admin/quotes/[id]/edit
- تعديل عرض مع حفظ نسخة (Revision).

---

## C5) /admin/bookings (List)
- Filters متقدمة (status/type/date/amount).
- Bulk actions: send reminders, export, create invoice.

## C6) /admin/bookings/new
- Availability check حقيقي.
- اختيار كمية لكل معدة.
- حساب تلقائي للتكلفة.

## C7) /admin/bookings/[id]
- Tabs كاملة تعمل (Delivery, Returns, Audit).
- Actions: change request, extend booking, partial refund.
- Timeline + Audit Trail.

## C8) /admin/calendar
- تقويم تفاعلي (Day/Week/Month/Agenda/Timeline).
- Drag & Drop + conflict detection.

## C9) /admin/change-requests
- إدارة طلبات التعديل + approvals.

## C10) /admin/extensions
- إدارة طلبات تمديد الحجز.

## C11) /admin/availability
- لوحة توافر المعدات/الاستوديو.
- Conflict dashboard.

---

# القسم D: Inventory & Assets

## D1) /admin/inventory
- KPI cards (total items, in maintenance, low stock).

## D2) /admin/inventory/equipment (List)
- Filters متقدمة (brand, location, price range).
- Bulk edit + export.

## D3) /admin/inventory/equipment/new
- تحقق شروط الكمية + تواريخ التوافر.

## D4) /admin/inventory/equipment/[id]
- Usage history + maintenance history.

## D5) /admin/inventory/equipment/[id]/edit
- Change log.

## D6) /admin/inventory/categories
- CRUD + hierarchy + stats لكل فئة.

## D7) /admin/inventory/brands
- CRUD + performance stats.

## D8) /admin/inventory/import
- Import history + rollback.

## D9) /admin/inventory/products
- قائمة المنتجات التي تحتاج AI review.

---

# القسم E: Studios Management

## E1) /admin/studios (Live)
- بيانات كاملة (location, pricing, availability, media, policies).
- Calendar خاص بالاستوديو.

## E2) /admin/studios/new / [id] / edit
- نموذج متكامل بالمواصفات والتسعير والسياسات.

## E3) /admin/studios/packages
- إدارة باقات الاستوديو (Podcast/Product/Portrait/Interview).

## E4) /admin/studios/add-ons
- إدارة إضافات الاستوديو (staff/services/equipment).

---

# القسم F: Operations

## F1) /admin/ops/warehouse
- طوابير + KPIs + Quick Actions.

## F2) /admin/ops/warehouse/check-out
- عملية إخراج معدات + barcode scan + checklist.

## F3) /admin/ops/warehouse/check-in
- عملية إرجاع + damage assessment.

## F4) /admin/ops/warehouse/inventory
- جرد المخزون + adjustments.

## F5) /admin/ops/delivery
- قائمة التوصيلات + حالة + driver assignment.

## F6) /admin/ops/delivery/schedule
- جدول التوصيل + route planning.

## F7) /admin/technicians
- CRUD + schedule + workload.

## F8) /admin/maintenance
- قائمة + KPIs + preventive schedule.

## F9) /admin/maintenance/new / [id]
- Work order + parts + cost tracking.

---

# القسم G: Finance & Legal

## G1) /admin/invoices
- CRUD كامل + PDF + Email + Aging.

## G2) /admin/invoices/new
- إنشاء فاتورة مباشرة.

## G3) /admin/invoices/[id]
- تفاصيل + PDF + إرسال.

## G4) /admin/payments
- قائمة مع KPIs (success/refund).

## G5) /admin/payments/[id]
- تفاصيل + retry + refund.

## G6) /admin/refunds
- قائمة refunds + status + approvals.

## G7) /admin/contracts
- CRUD + توقيع إلكتروني.

## G8) /admin/contracts/[id]
- تفاصيل + resend.

## G9) /admin/finance
- Overview ديناميكي بدل mock.

## G10) /admin/finance/reports
- Charts حقيقية + export + scheduling.

---

# القسم H: CRM & Marketing

## H1) /admin/clients
- قائمة + segmentation + LTV.

## H2) /admin/clients/new / [id]
- CRUD كامل + history + notes.

## H3) /admin/coupons
- قائمة + analytics.

## H4) /admin/coupons/new / [id]
- CRUD كامل + usage stats.

## H5) /admin/offers
- إدارة العروض الترويجية.

## H6) /admin/packages
- إدارة Packages (Equipment/Studio/Mixed).

## H7) /admin/bundles
- Bundles + discounts.

## H8) /admin/marketing
- قائمة حملات.

## H9) /admin/marketing/campaigns/new / [id]
- إنشاء حملة + تحليلات (open/click/conversion).

## H10) /admin/recommendations
- Rules + analytics + A/B testing.

## H11) /admin/compatibility
- Matrix للـ camera/lens compatibility.

---

# القسم I: AI & Pricing

## I1) /admin/ai
- إضافة KPIs + usage analytics + history.

## I2) /admin/dynamic-pricing
- نظام تسعير ديناميكي كامل.

## I3) /admin/kit-builder
- صفحة مخصصة أو redirect لداخل /admin/ai.

---

# القسم J: Settings & Security

## J1) /admin/settings
- إعدادات عامة (Company, VAT, Currency, Branding).

## J2) /admin/settings/integrations
- Logs + env separation + retry tracking.

## J3) /admin/settings/features
- Rollouts + targeting.

## J4) /admin/settings/roles
- CRUD فعلي + permission matrix.

## J5) /admin/settings/roles/[id]
- تعديل دور + حفظ.

## J6) /admin/settings/ai-control
- Job history + budgets + alerts.

## J7) /admin/settings/availability-rules
- Buffer times + blackout dates + min/max duration.

## J8) /admin/settings/notifications
- قنوات + templates + schedules.

## J9) /admin/settings/audit-log
- سجل كامل لكل الأحداث.

---

# القسم K: Super Admin

## K1) /admin/super
- إضافة Audit Log + MFA + confirm double.

---

# القسم L: صفحات النظام الأساسية

## L1) /admin/notifications
- In-app notifications.

## L2) /admin/profile
- ملف المستخدم + تغيير كلمة مرور.

---

## 3) قائمة الميزات المشتركة لكل الصفحات
- **KPI strip** لكل صفحة قائمة.
- **Filters** متقدمة + حفظها.
- **Bulk actions** حيث ينطبق.
- **Export** لكل قوائم الأعمال.
- **Audit Trail** لأي تغيير مالي/عملياتي.
- **Empty State** مع CTA واضح.

---

## 4) المخرجات المطلوبة للـ Production
- كل الروابط تعمل.
- لا توجد صفحات Mock/Placeholder.
- جميع الـ APIs تعمل وتعيد بيانات حقيقية.
- الصلاحيات مطبقة على مستوى UI وAPI.
- تقارير مالية حقيقية قابلة للتصدير.
- Calendar + Availability حقيقي.
- Operations flow مكتمل (check‑in/out + delivery schedule).

---

> هذا المستند هو النسخة الإنتاجية الشاملة المطلوبة لإكمال لوحة التحكم بالكامل.
