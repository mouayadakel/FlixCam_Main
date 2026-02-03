# 🧭 التقرير النهائي الشامل لإكمال لوحة التحكم 100% (Production‑Ready)

**المشروع:** FlixCam.rent – Admin Panel  
**التاريخ:** 2026-01-30  
**الهدف:** ملف واحد نهائي ومتكامل يدمج كل المواصفات والتدقيقات ويحدد بدقة كل صفحة، كل ميزة، كل KPI، وكل نقص مطلوب إكماله للوصول إلى لوحة تحكم احترافية كاملة بدون أي فجوات.

---

## 0) المصادر المدمجة (مصدر الحقيقة)
- `docs/planning/admin_panel_complete_specification_part1.md` (Dashboard & Analytics)
- `docs/planning/admin_panel_complete_specification_part2.md` (Action Center & Approvals)
- `docs/planning/admin_panel_complete_specification_part3.md` (Booking Engine + AI + Dynamic Pricing)
- `docs/planning/admin_panel_complete_specification_part4.md` (Studios + Packages + Warehouse)
- `docs/planning/ADMIN_PANEL_COMPLETE_SPECIFICATION_FULL.md`
- `docs/planning/ADMIN_PANEL_EXECUTIVE_SUMMARY.md`
- `CONTROL_PANEL_SIDEBAR_AUDIT.md`
- `CONTROL_PANEL_FULL_AUDIT_DETAILED.md`
- مراجعة مسارات `/src/app/admin` والـ Sidebar الفعلي

> **ملاحظة:** هذا المستند يقدّم **المخرجات التنفيذية النهائية** المطلوبة للبرودكشن. أي نقص بعد تطبيقه يُعد فجوة يجب سدّها فورًا.

---

## 1) تعريف الجاهزية الإنتاجية (Non‑Negotiables)
- لا توجد صفحات Mock/Placeholder إطلاقًا.
- لا يوجد رابط ميت أو صفحة ناقصة.
- كل صفحة تحتوي بيانات حقيقية + إجراءات فعّالة + صلاحيات صحيحة.
- RBAC كامل + Audit Log لكل الأحداث الحساسة.
- كل القوائم تدعم: Pagination + Filters + Search + Bulk Actions + Export.
- كل العمليات المالية تولّد مستندات رسمية (PDF/Email/Logs).
- كل المسارات الحرجة لديها تحقّقات بيانات + حالات أخطاء واضحة + رسائل للمستخدم.
- كل الـ KPIs تُحسب من البيانات الفعلية (لا قيم ثابتة).
- Monitoring/Logging/Alerts متكاملة.

---

## 2) الوضع الحالي بالأرقام (حسب الكود الحالي)
- **صفحات Live:** ~25 (≈33%)
- **صفحات Mock/Placeholder:** ~15 (≈20%)
- **صفحات Missing:** ~35 (≈47%)
- **APIs مكتملة:** ~40%
- **الجاهزية الإنتاجية:** منخفضة (MVP)

**الفجوات الحرجة اليوم:**
- Calendar + Availability غير مكتملين.
- Warehouse Check‑out/Check‑in غير موجود.
- Invoices/Payments/Refunds غير مكتملة.
- Roles & Permissions وهمية.
- Action Center / Approvals / Live Ops مفقودة.

---

## 3) معايير واجهة موحّدة (Baseline لكل الصفحات)

### 3.1 معيار صفحات القوائم (List Pages)
- شريط KPI أعلى الصفحة (إجمالي + مؤشرات فرعية).
- Search + Filters متقدمة (حالة، نوع، فترة زمنية، نطاق قيمة…).
- جدول مع Sorting + Column Visibility + Sticky Actions.
- Pagination حقيقية (server‑side) + اختيار page size.
- Bulk Actions (تغيير حالة، تصدير، حذف، تعيين مسؤول…).
- Export (CSV / Excel / PDF).
- Empty State ذكي مع CTA.
- Last Updated + Refresh.

### 3.2 معيار صفحات التفاصيل (Detail Pages)
- Header واضح: رقم/اسم + Status Badge + Primary Actions.
- Tabs: Overview / Items / Payments / Timeline / Notes / Files.
- Timeline/Audit للأحداث الرئيسية.
- Quick actions panel (يمين/يسار) للإجراءات الأكثر تكرارًا.
- روابط مرتبطة (Client, Booking, Invoice…).

### 3.3 معيار صفحات الإنشاء/التعديل
- Wizard متعدد الخطوات + Save Draft.
- Validations فورية.
- Preview نهائي قبل الحفظ.
- Auto‑calculations واضحة (السعر، الضرائب، الخصومات).

### 3.4 عناصر UX إلزامية
- Global Search في الهيدر.
- RTL عربي أولًا + English.
- مساعد سياقي (Tooltips/Help).
- رسائل نجاح/خطأ مفهومة.

---

## 4) فهرس شامل بكل الصفحات + الحالة (Current vs Required)

**المفاتيح:**
- **LIVE**: موجود ومرتبط ببيانات حقيقية.
- **MOCK**: موجود لكن بيانات ثابتة/وهمية.
- **MISSING**: غير موجود.
- **NEW**: مطلوب إضافته حسب المواصفات.

| المسار | الحالة | الأولوية | ملاحظات |
|---|---|---|---|
| /admin | LIVE | P0 | Redirect إلى /admin/dashboard |
| /admin/dashboard | LIVE | P0 | KPIs حقيقية لكن مقارنة زمنية ناقصة |
| /admin/dashboard/overview | MOCK | P0 | Placeholder |
| /admin/dashboard/revenue | MOCK | P1 | Placeholder |
| /admin/dashboard/activity | MOCK | P1 | Placeholder |
| /admin/dashboard/recent-bookings | MOCK | P1 | Placeholder |
| /admin/dashboard/quick-actions | MOCK | P1 | Placeholder |
| /admin/action-center | MISSING | P0 | مركز المهام الحرجة |
| /admin/approvals | MISSING | P0 | UI غير موجود رغم وجود API |
| /admin/live-ops | MISSING | P1 | عمليات حية |
| /admin/quotes | LIVE | P0 | قائمة العروض |
| /admin/quotes/new | MISSING | P0 | إنشاء عرض |
| /admin/quotes/[id] | LIVE | P0 | تفاصيل عرض |
| /admin/quotes/[id]/edit | NEW | P1 | تعديل عرض مع versioning |
| /admin/bookings | LIVE | P0 | قائمة الحجوزات |
| /admin/bookings/new | LIVE | P0 | إنشاء حجز |
| /admin/bookings/[id] | LIVE | P0 | تفاصيل الحجز |
| /admin/calendar | MOCK | P0 | Calendar وهمي |
| /admin/change-requests | NEW | P1 | طلبات تعديل الحجوزات |
| /admin/extensions | NEW | P1 | طلبات تمديد |
| /admin/availability | NEW | P0 | لوحة التوفر |
| /admin/settings/availability-rules | NEW | P1 | قواعد التوفر |
| /admin/ai | LIVE | P1 | تبويبات AI |
| /admin/kit-builder | MISSING | P1 | رابط sidebar غير منفذ |
| /admin/dynamic-pricing | MISSING | P1 | رابط sidebar غير منفذ |
| /admin/ai-recommendations | MISSING | P1 | رابط sidebar غير منفذ |
| /admin/recommendations | NEW | P1 | صفحة إدارة التوصيات |
| /admin/compatibility | NEW | P2 | مصفوفة توافق المعدات |
| /admin/pricing | NEW | P0 | قواعد التسعير الأساسية |
| /admin/discount-rules | NEW | P1 | قواعد خصم مركزية |
| /admin/packages | NEW | P0 | إدارة الباقات |
| /admin/bundles | NEW | P0 | إدارة الباندلز |
| /admin/offers | NEW | P1 | إدارة العروض |
| /admin/inventory | MOCK | P2 | صفحة بوابة |
| /admin/inventory/equipment | LIVE | P0 | قائمة المعدات |
| /admin/inventory/equipment/new | LIVE | P0 | إنشاء معدة |
| /admin/inventory/equipment/[id] | LIVE | P0 | تفاصيل معدة |
| /admin/inventory/equipment/[id]/edit | LIVE | P0 | تعديل معدة |
| /admin/inventory/categories | MOCK | P0 | تصنيفات وهمية |
| /admin/inventory/brands | MISSING | P0 | علامة تجارية |
| /admin/inventory/import | LIVE | P1 | استيراد Excel + AI |
| /admin/inventory/products | MISSING | P1 | إدارة منتجات بعد الاستيراد |
| /admin/inventory/products/[id]/review | LIVE | P1 | مراجعة AI |
| /admin/studios | MOCK | P0 | استوديوهات وهمية |
| /admin/studios/new | NEW | P0 | إنشاء استوديو |
| /admin/studios/[id] | NEW | P0 | تفاصيل استوديو |
| /admin/studios/[id]/edit | NEW | P0 | تعديل استوديو |
| /admin/studios/packages | NEW | P0 | باقات استوديو |
| /admin/studios/add-ons | NEW | P1 | إضافات الاستوديو |
| /admin/ops/warehouse | LIVE | P0 | قائمة Queue فقط |
| /admin/ops/warehouse/check-out | MISSING | P0 | عملية إخراج |
| /admin/ops/warehouse/check-in | MISSING | P0 | عملية إدخال |
| /admin/ops/warehouse/inventory | MISSING | P1 | جرد المستودع |
| /admin/ops/delivery | LIVE | P0 | قائمة التوصيل |
| /admin/ops/delivery/schedule | MISSING | P1 | جدولة التوصيل |
| /admin/technicians | MOCK | P1 | فنيون وهميون |
| /admin/maintenance | LIVE | P0 | قائمة الصيانة |
| /admin/maintenance/new | MISSING | P1 | إنشاء أمر صيانة |
| /admin/maintenance/[id] | MISSING | P1 | تفاصيل صيانة |
| /admin/invoices | LIVE | P0 | قائمة الفواتير |
| /admin/invoices/new | MISSING | P0 | إنشاء فاتورة |
| /admin/invoices/[id] | MISSING | P0 | تفاصيل فاتورة |
| /admin/payments | LIVE | P0 | قائمة المدفوعات |
| /admin/payments/[id] | MISSING | P1 | تفاصيل مدفوعة |
| /admin/refunds | NEW | P1 | إدارة الاستردادات |
| /admin/contracts | LIVE | P1 | قائمة العقود |
| /admin/contracts/[id] | MISSING | P1 | تفاصيل عقد |
| /admin/finance | MOCK | P2 | نظرة مالية عامة |
| /admin/finance/reports | LIVE (جزئي) | P1 | تقارير + JSON خام |
| /admin/clients | LIVE | P0 | قائمة العملاء |
| /admin/clients/new | MISSING | P0 | إنشاء عميل |
| /admin/clients/[id] | MISSING | P0 | تفاصيل عميل |
| /admin/coupons | LIVE | P1 | قائمة الكوبونات |
| /admin/coupons/new | MISSING | P0 | إنشاء كوبون |
| /admin/coupons/[id] | MISSING | P0 | تفاصيل كوبون |
| /admin/coupons/[id]/analytics | NEW | P2 | تحليلات كوبون |
| /admin/marketing | LIVE | P1 | قائمة حملات |
| /admin/marketing/campaigns/new | MISSING | P1 | إنشاء حملة |
| /admin/marketing/campaigns/[id] | MISSING | P1 | تفاصيل حملة |
| /admin/orders | LIVE | P2 | قائمة الطلبات |
| /admin/orders/new | MISSING | P2 | إنشاء طلب |
| /admin/orders/[id] | MISSING | P2 | تفاصيل طلب |
| /admin/wallet | MOCK | P2 | محفظة وهمية |
| /admin/wallet/[id] | MISSING | P2 | تفاصيل محفظة |
| /admin/users | MOCK | P1 | قائمة مستخدمين وهمية |
| /admin/settings | MOCK | P1 | بوابة إعدادات |
| /admin/settings/integrations | LIVE | P1 | تكاملات حقيقية |
| /admin/settings/features | LIVE | P1 | Feature Flags |
| /admin/settings/roles | MOCK | P0 | أدوار وهمية |
| /admin/settings/roles/[id] | MOCK | P0 | تفاصيل أدوار وهمية |
| /admin/settings/ai-control | LIVE (جزئي) | P1 | تحليلات AI |
| /admin/settings/audit-log | NEW | P0 | سجل التدقيق |
| /admin/settings/notifications | NEW | P1 | إعدادات الإشعارات |
| /admin/settings/company-profile | NEW | P1 | بيانات الشركة |
| /admin/settings/policies | NEW | P1 | سياسات الحجز والإلغاء |
| /admin/settings/taxes | NEW | P1 | ضرائب/VAT |
| /admin/settings/branding | NEW | P2 | الهوية البصرية |
| /admin/settings/security | NEW | P1 | أمان متقدم |
| /admin/settings/localization | NEW | P2 | لغات/عملات |
| /admin/settings/payment-methods | NEW | P1 | طرق الدفع |
| /admin/super | LIVE | P1 | أدوات Super Admin |
| /admin/notifications | MISSING | P2 | إشعارات النظام |
| /admin/profile | MISSING | P2 | ملف المستخدم |

---

# 5) التفاصيل التنفيذية لكل صفحة (Page‑by‑Page Spec)

> **مهم:** لكل صفحة أدناه تم تحديد: الهدف، المحتوى المطلوب، الـ KPIs، الأزرار، البيانات، والنواقص مقارنة بالحالة الحالية.

---

## A) Command Center – لوحة القيادة

### A1) `/admin/dashboard` (LIVE)
**الهدف:** لوحة أداء تشغيلية ومالية فورية.

**المحتوى المطلوب (Production):**
- Date Range Selector + Compare (Previous Period/Year).
- KPI Cards: Revenue / Bookings / Occupancy / New Clients + Targets.
- Revenue Breakdown (Equipment/Studio/Packages/Add‑ons).
- Charts: Revenue Over Time + Booking Status Distribution + Occupancy Trend.
- Alerts Widget (Failed payments, Low stock, Late returns, Upcoming maintenance).
- Recent Bookings table (مع drill‑down).
- Quick Actions قابلة للتخصيص.
- AI Forecast Widget (اختياري).

**KPIs المفروضة:**
- إجمالي الإيراد (الفترة المختارة).
- معدل التحويل Quotes → Bookings.
- معدل الإشغال للمعدات + الاستوديوهات.
- الإيراد حسب النوع + نسبة النمو MoM/YoY.
- متوسط قيمة الحجز.

**الأزرار الأساسية:**
- إنشاء حجز، إنشاء عرض، عرض التقويم، عرض التقارير، تصدير.

**النواقص الحالية:** المقارنات hardcoded، لا Date Range، لا Alerts، لا Drill‑down.

**Make it pop:**
- شريط “Today Ops”: (حجوزات اليوم/التسليمات/التأخيرات).
- Insights آلية (Top 5 معدات، مخاطر، توصيات).

---

### A2) `/admin/dashboard/overview` (MOCK)
**الهدف:** لوحة Widgets قابلة للتخصيص (Drag & Drop).

**المحتوى المطلوب:**
- مكتبة Widgets (Revenue, Bookings, Top Equipment, Alerts…)
- Drag & Drop layout + Save layout.
- Widgets قابلة للتكبير/التصغير.

**النواقص:** صفحة فارغة.

---

### A3) `/admin/dashboard/revenue` (MOCK)
**الهدف:** تحليلات الإيرادات المتقدمة.

**المحتوى المطلوب:**
- KPIs: Total Revenue, ARPU, AOV, Revenue per Category.
- Charts: Revenue Trend + Category Split + Client Contribution.
- Tables: Top Equipment by Revenue, Top Clients, Monthly Revenue.
- Export/Schedule Reports.

**النواقص:** لا بيانات ولا تقارير.

---

### A4) `/admin/dashboard/activity` (MOCK)
**الهدف:** Activity Feed للنظام.

**المحتوى المطلوب:**
- Real‑time feed (Bookings, Payments, Inventory changes).
- Filters (type/user/date).
- Export + search.

**النواقص:** Placeholder فقط.

---

### A5) `/admin/dashboard/recent-bookings` (MOCK)
**الهدف:** قائمة متقدمة للحجوزات الأخيرة.

**المحتوى المطلوب:**
- KPIs summary + Table advanced.
- Bulk Actions (Reminder, Export, Print).
- Filters (status, type, date).

**النواقص:** Placeholder.

---

### A6) `/admin/dashboard/quick-actions` (MOCK)
**الهدف:** Command Center للأوامر السريعة.

**المحتوى المطلوب:**
- Actions grouped (Bookings/Inventory/Finance/Operations).
- Favorites + Command Palette (Ctrl+K).

**النواقص:** Placeholder.

---

## B) Action Center & Approvals

### B1) `/admin/action-center` (MISSING)
**الهدف:** Inbox للمهام الحرجة والتنبيهات.

**المحتوى المطلوب:**
- Summary (urgent/high/normal).
- Queue بمهام: Failed payments, Late returns, Low stock, Maintenance due.
- Actions مباشرة (Retry, Contact, Approve…).
- SLA + Assignment + Escalation.

**KPIs:** عدد المهام المتأخرة، متوسط زمن الاستجابة، نسبة الإغلاق.

**النواقص:** الصفحة غير موجودة.

---

### B2) `/admin/approvals` (MISSING)
**الهدف:** نظام مركزي للموافقات.

**المحتوى المطلوب:**
- أنواع الموافقات: Discounts, Refunds, Overbooking, Manual bookings.
- Approval history + audit trail.
- Multi‑level approval + delegation.

**النواقص:** UI غير موجودة.

---

### B3) `/admin/live-ops` (MISSING)
**الهدف:** لوحة عمليات حيّة.

**المحتوى المطلوب:**
- Active bookings timeline.
- Delivery status + map (اختياري).
- Check‑out/check‑in queues.
- Live alerts.

**النواقص:** الصفحة غير موجودة.

---

## C) Booking Engine

### C1) `/admin/quotes` (LIVE)
**الهدف:** إدارة عروض الأسعار.

**المحتوى المطلوب:**
- KPI strip: Pipeline value, Win rate, Expiring soon.
- Table columns: Quote ID, Client, Status, Dates, Amount, Expiry.
- Filters: Status, Date, Client type, Amount range.
- Bulk actions: Send, Export, Archive.

**النواقص الحالية:** لا KPI، لا bulk actions، لا export، لا pagination حقيقية.

---

### C2) `/admin/quotes/new` (MISSING)
**الهدف:** إنشاء عرض سعر Wizard.

**الحقول/الخطوات المطلوبة:**
- Client selection (existing/new/guest).
- Items selection (equipment/studio/packages).
- Pricing (discounts, add‑ons, taxes).
- Terms (delivery, cancellation, deposit).
- Review & send.

**أزرار:** Save Draft، Generate PDF، Send Email/WhatsApp.

---

### C3) `/admin/quotes/[id]` (LIVE)
**الهدف:** تفاصيل عرض السعر.

**المحتوى المطلوب:**
- Overview + Items + Pricing + Timeline.
- Actions: Send, Accept/Reject, Convert to Booking.
- PDF/Print + Version History.

**النواقص الحالية:** لا PDF، لا versioning، لا audit trail.

---

### C4) `/admin/bookings` (LIVE)
**الهدف:** قائمة الحجوزات.

**المطلوب:**
- KPI strip: Active, Upcoming, Overdue, At risk.
- Filters متقدمة + Bulk Actions.
- Columns: Booking ID, Client, Items, Dates, Status, Payment Status.
- Status badges + health flags.

**النواقص الحالية:** لا KPI، لا bulk actions، لا conflict alerts.

---

### C5) `/admin/bookings/new` (LIVE)
**الهدف:** إنشاء حجز.

**المطلوب:**
- Wizard مشابه للـ quotes مع Availability check حقيقي.
- Auto‑pricing + discounts rules.
- Payment capture/authorization.

**نواقص محتملة:** عدم وجود rules كاملة للخصومات والباقات.

---

### C6) `/admin/bookings/[id]` (LIVE)
**الهدف:** تفاصيل الحجز + إدارة الحالات.

**المطلوب:**
- Tabs: Items, Payments, Delivery, Check‑out/in, History.
- Actions: Extend, Change request, Refund, Cancel.
- Condition report لكل معدة.

**النواقص الحالية:** لا Change Requests ولا Extensions ولا Refund UI.

---

### C7) `/admin/calendar` (MOCK)
**الهدف:** تقويم الموارد الحقيقي.

**المحتوى المطلوب:**
- Day/Week/Month views + Resource timeline.
- Drag & Drop reschedule.
- Conflict highlighting.
- Availability overlay + filters.

**النواقص الحالية:** تقويم وهمي.

---

### C8) `/admin/change-requests` (NEW)
**الهدف:** إدارة طلبات التعديل.

**المحتوى المطلوب:**
- List + approvals workflow.
- حساب فرق السعر تلقائياً.
- Communicate with client.

---

### C9) `/admin/extensions` (NEW)
**الهدف:** إدارة تمديدات الحجوزات.

**المحتوى المطلوب:**
- Availability check + price calc.
- Approve/Reject + update booking.

---

### C10) `/admin/availability` (NEW)
**الهدف:** لوحة التوفر العامة.

**المحتوى المطلوب:**
- Heatmap للموارد.
- Blocks/blackouts.
- Overbooking alerts.

---

### C11) `/admin/settings/availability-rules` (NEW)
**الهدف:** إعداد قواعد التوفر.

**المحتوى المطلوب:**
- Buffer time rules.
- Business hours.
- Minimum/maximum duration.

---

## D) Smart Sales Tools & AI

### D1) `/admin/ai` (LIVE)
**الهدف:** مركز أدوات AI.

**المحتوى المطلوب:**
- Tabs: Kit Builder, Import, Translation, Q&A, Pricing, Forecast.
- Analytics: usage, cost, accuracy.

**النواقص الحالية:** لا فصل واضح للـ Kit Builder كصفحة مستقلة، لا AI cost controls كاملة.

---

### D2) `/admin/kit-builder` (MISSING)
**الهدف:** Kit Builder مستقل.

**المحتوى المطلوب:**
- بناء kits وإدارتها + حفظ templates + export.

---

### D3) `/admin/dynamic-pricing` (MISSING)
**الهدف:** تسعير ديناميكي AI.

**المحتوى المطلوب:**
- Strategy config (demand/time/utilization).
- Simulation + A/B tests.
- Audit لكل تغيير سعر.

---

### D4) `/admin/ai-recommendations` / `/admin/recommendations` (MISSING)
**الهدف:** إدارة توصيات upsell.

**المحتوى المطلوب:**
- Rules‑based + AI models.
- Analytics (CTR, revenue impact).

---

### D5) `/admin/compatibility` (NEW)
**الهدف:** مصفوفة توافق المعدات.

**المحتوى المطلوب:**
- Camera ↔ Lens compatibility.
- Rules engine يمنع اختيار غير متوافق.

---

### D6) `/admin/pricing` (NEW)
**الهدف:** قواعد التسعير الثابتة.

**المحتوى المطلوب:**
- Daily/Weekly/Monthly rates.
- Seasonal adjustments.
- Minimum charge rules.

---

### D7) `/admin/discount-rules` (NEW)
**الهدف:** مركز قواعد الخصم وترتيب الأولويات.

---

## E) Packages, Bundles & Offers

### E1) `/admin/packages` (NEW)
**الهدف:** إدارة باقات جاهزة.

**المحتوى المطلوب:**
- CRUD Packages.
- Items included + pricing strategy.
- Conditions (min duration, eligible clients).

---

### E2) `/admin/bundles` (NEW)
**الهدف:** Bundles بتخفيض تلقائي.

**المحتوى المطلوب:**
- Rules + auto‑suggest.

---

### E3) `/admin/offers` (NEW)
**الهدف:** عروض ترويجية.

**المحتوى المطلوب:**
- Time‑limited offers + coupon integration.

---

## F) Inventory & Assets

### F1) `/admin/inventory` (MOCK)
**الهدف:** بوابة المخزون.

**المحتوى المطلوب:** KPIs + روابط مباشرة + حالة المخزون.

---

### F2) `/admin/inventory/equipment` (LIVE)
**المحتوى المطلوب:**
- KPI strip: total units, available, in‑use, maintenance.
- Filters: category, brand, status, availability.
- Bulk actions: mark maintenance, export, assign location.

**النواقص:** لا KPIs ولا bulk actions.

---

### F3) `/admin/inventory/equipment/new` (LIVE)
**المطلوب:**
- Fields كاملة (specs, pricing, availability, media).
- QR/Barcode auto‑generation.

---

### F4) `/admin/inventory/equipment/[id]` (LIVE)
**المحتوى المطلوب:**
- Usage history + Maintenance history.
- Depreciation + Insurance.
- Availability calendar.

---

### F5) `/admin/inventory/categories` (MOCK)
**المطلوب:**
- CRUD categories + hierarchy.

---

### F6) `/admin/inventory/brands` (MISSING)
**المطلوب:**
- CRUD brands + logo + warranty info.

---

### F7) `/admin/inventory/import` (LIVE)
**المطلوب:**
- Import history + audit.
- Bulk edit after import.

---

### F8) `/admin/inventory/products` (MISSING)
**المطلوب:**
- Products list + link to AI review.

---

### F9) `/admin/inventory/products/[id]/review` (LIVE)
**المطلوب:**
- Approval workflow + corrections.

---

## G) Studios

### G1) `/admin/studios` (MOCK)
**المطلوب:**
- CRUD studios + pricing + availability + media.

---

### G2) `/admin/studios/new` / `[id]` / `[id]/edit` (NEW)
**المحتوى المطلوب:**
- Wizard لإنشاء استوديو مع Tabs (Info, Location, Media, Pricing, Rules).

---

### G3) `/admin/studios/packages` (NEW)
**المطلوب:**
- إدارة باقات الاستوديو (Podcast/Product/etc).

---

### G4) `/admin/studios/add-ons` (NEW)
**المطلوب:**
- خدمات إضافية (staff, equipment, catering).

---

## H) Operations

### H1) `/admin/ops/warehouse` (LIVE)
**المطلوب:**
- Queue + Check‑out/in flows.
- Barcode/QR scanning.

---

### H2) `/admin/ops/warehouse/check-out` (MISSING)
**المطلوب:**
- خطوات تحقق + توثيق حالة المعدات + توقيع العميل.

---

### H3) `/admin/ops/warehouse/check-in` (MISSING)
**المطلوب:**
- فحص عند العودة + تسجيل أضرار + رسوم.

---

### H4) `/admin/ops/warehouse/inventory` (MISSING)
**المطلوب:**
- جرد دوري + discrepancy report.

---

### H5) `/admin/ops/delivery` (LIVE)
**المطلوب:**
- قائمة توصيل + حالات + driver assignment.

---

### H6) `/admin/ops/delivery/schedule` (MISSING)
**المطلوب:**
- جدولة + Route optimization + Proof of Delivery.

---

### H7) `/admin/technicians` (MOCK)
**المطلوب:**
- إدارة الفنيين + المهارات + الجداول.

---

### H8) `/admin/maintenance` (LIVE)
**المطلوب:**
- Maintenance list + status + costs.

---

### H9) `/admin/maintenance/new` / `[id]` (MISSING)
**المطلوب:**
- إنشاء أوامر صيانة + قطع غيار + SLA.

---

## I) Finance & Legal

### I1) `/admin/invoices` (LIVE)
**المطلوب:**
- KPI strip (Paid/Unpaid/Overdue).
- Actions: create, send, download.

---

### I2) `/admin/invoices/new` (MISSING)
**المطلوب:**
- Invoice generator + taxes + PDF.

---

### I3) `/admin/invoices/[id]` (MISSING)
**المطلوب:**
- تفاصيل فاتورة + timeline + send + record payment.

---

### I4) `/admin/payments` (LIVE)
**المطلوب:**
- Payment list + status filters + retry.

---

### I5) `/admin/payments/[id]` (MISSING)
**المطلوب:**
- Payment details + refund action + gateway logs.

---

### I6) `/admin/refunds` (NEW)
**المطلوب:**
- Refund list + approval + policy check.

---

### I7) `/admin/contracts` (LIVE)
**المطلوب:**
- قائمة عقود + status + upload templates.

---

### I8) `/admin/contracts/[id]` (MISSING)
**المطلوب:**
- تفاصيل عقد + e‑sign + audit.

---

### I9) `/admin/finance` (MOCK)
**المطلوب:**
- نظرة مالية عامة + KPIs.

---

### I10) `/admin/finance/reports` (LIVE جزئي)
**المطلوب:**
- Reports charts + export + scheduling.
- إزالة عرض JSON الخام.

---

## J) CRM & Marketing

### J1) `/admin/clients` (LIVE)
**المطلوب:**
- KPI: LTV, Repeat rate, ARPU.
- Filters (segment, tag, type).

---

### J2) `/admin/clients/new` (MISSING)
**المطلوب:**
- إنشاء عميل + validation + KYC optional.

---

### J3) `/admin/clients/[id]` (MISSING)
**المطلوب:**
- Profile شامل + booking history + invoices + communications.

---

### J4) `/admin/coupons` (LIVE)
**المطلوب:**
- KPI strip + usage analytics.

---

### J5) `/admin/coupons/new` / `[id]` (MISSING)
**المطلوب:**
- Coupon CRUD + conditions + limits.

---

### J6) `/admin/coupons/[id]/analytics` (NEW)
**المطلوب:**
- Redemption rate, ROI.

---

### J7) `/admin/marketing` (LIVE)
**المطلوب:**
- Campaign list + KPIs (reach, conversion).

---

### J8) `/admin/marketing/campaigns/new` / `[id]` (MISSING)
**المطلوب:**
- إنشاء حملة + audience + channels (email/SMS/WhatsApp).

---

## K) Orders & Wallet

### K1) `/admin/orders` (LIVE)
**المطلوب:**
- KPI + order lifecycle + links to bookings.

---

### K2) `/admin/orders/new` / `[id]` (MISSING)
**المطلوب:**
- إنشاء/تفاصيل طلب.

---

### K3) `/admin/wallet` (MOCK)
**المطلوب:**
- Wallet balances + transactions.

---

### K4) `/admin/wallet/[id]` (MISSING)
**المطلوب:**
- Wallet detail + adjustments.

---

## L) Users, Roles & Access

### L1) `/admin/users` (MOCK)
**المطلوب:**
- Users CRUD + roles assignment + status.

---

### L2) `/admin/settings/roles` + `/[id]` (MOCK)
**المطلوب:**
- Roles CRUD + permission matrix + audit.

---

## M) Settings

### M1) `/admin/settings` (MOCK)
**المطلوب:**
- Settings hub + quick links + health checks.

---

### M2) `/admin/settings/integrations` (LIVE)
**المطلوب:**
- Webhook logs + retries + environments.

---

### M3) `/admin/settings/features` (LIVE)
**المطلوب:**
- Feature flags + audit log.

---

### M4) `/admin/settings/ai-control` (LIVE جزئي)
**المطلوب:**
- Cost monitoring + model selection + quotas.

---

### M5) `/admin/settings/audit-log` (NEW)
**المطلوب:**
- سجل شامل لكل الأحداث الحساسة.

---

### M6) `/admin/settings/notifications` (NEW)
**المطلوب:**
- إعدادات Email/SMS/WhatsApp + templates.

---

### M7) `/admin/settings/company-profile` (NEW)
**المطلوب:**
- بيانات الشركة + VAT + logo.

---

### M8) `/admin/settings/policies` (NEW)
**المطلوب:**
- سياسات الإلغاء/التأخير/الضرر.

---

### M9) `/admin/settings/taxes` (NEW)
**المطلوب:**
- VAT rules + tax exemptions.

---

### M10) `/admin/settings/security` (NEW)
**المطلوب:**
- MFA، IP whitelist، session timeout.

---

### M11) `/admin/settings/branding` (NEW)
**المطلوب:**
- Colors, logos, email templates.

---

### M12) `/admin/settings/localization` (NEW)
**المطلوب:**
- لغات + عملات + timezone.

---

### M13) `/admin/settings/payment-methods` (NEW)
**المطلوب:**
- بوابات الدفع + اختبار اتصال.

---

## N) Super Admin & System

### N1) `/admin/super` (LIVE)
**المطلوب:**
- Health checks + Job rerun + lock release + force transitions.
- إضافة Audit log + MFA للعمليات الحرجة.

---

### N2) `/admin/notifications` (MISSING)
**المطلوب:**
- مركز إشعارات المستخدمين.

---

### N3) `/admin/profile` (MISSING)
**المطلوب:**
- Profile + preferences + security settings.

---

# 6) أولويات التنفيذ النهائية (Production Roadmap)

**P0 (حرج – بدونها لا إنتاج):**
- Calendar + Availability + Conflict Detection.
- Warehouse Check‑out/Check‑in.
- Invoices + Payments Details + Refunds.
- Roles & Permissions + Audit Log.
- Action Center + Approvals.
- Packages/Bundles + Studio Packages.

**P1 (High – خلال شهر):**
- Dynamic Pricing + Recommendations.
- Delivery Scheduling + Maintenance workflows.
- Reports متقدمة + Export.
- Clients/Contracts detail pages.

**P2 (Medium – لاحقًا):**
- Compatibility Matrix + Wallet + Orders advanced.
- Marketing automation + Loyalty.

---

# 7) الخلاصة
هذا الملف يقدّم **كل ما يلزم** ليصبح النظام 100% جاهز للبرودكشن بدون فجوات. أي صفحة مذكورة هنا يجب أن تكون Live ببيانات حقيقية وإجراءات كاملة. بعد تطبيق هذا المستند، تصبح لوحة التحكم جاهزة للاعتماد التجاري الكامل.


---

# 8) تفاصيل دقيقة (حقول + أزرار + حالات) للصفحات الحرجة

> هذا القسم يضمن أن كل صفحة ليست فقط موجودة، بل **تعمل بكامل معناها التشغيلي**. استخدمه كـ Checklist أثناء التنفيذ.

## 8.1 عروض الأسعار (Quotes)
**List Columns:** Quote ID, Client, Status, Issue Date, Expiry, Items Count, Total, Owner, Last Update.  
**Filters:** Status, Date Range, Client Type, Amount Range, Owner.  
**Actions:** View, Edit, Send, Duplicate, Convert to Booking, Archive, Export.  
**Statuses:** Draft, Sent, Accepted, Rejected, Expired, Converted.  

**Create/Edit Fields:**
- Client (existing/new/guest) + contact details.
- Items (equipment/studio/packages) + quantities + dates.
- Pricing: base, discounts, add‑ons, VAT.
- Terms: delivery/pickup, cancellation policy, deposit.
- Notes + internal tags.

---

## 8.2 الحجوزات (Bookings)
**List Columns:** Booking ID, Client, Type, Start/End, Status, Payment Status, Delivery, Amount, Check‑out/Check‑in.  
**Filters:** Status, Date Range, Type, Payment Status, Delivery Method.  
**Actions:** View, Extend, Change Request, Check‑out, Check‑in, Cancel.  
**Statuses:** Pending, Confirmed, Active, Completed, Cancelled, Overdue.  

**Detail Tabs:**
- Overview (client, dates, totals, status)
- Items (equipment/studio/packages)
- Payments (invoices, receipts)
- Delivery (schedule, driver)
- Check‑out / Check‑in (condition reports)
- Timeline/Audit

---

## 8.3 المعدات (Equipment)
**List Columns:** SKU, Name, Category, Brand, Status, Available Units, Daily Rate, Utilization, Last Maintenance.  
**Filters:** Category, Brand, Status, Availability, Location.  
**Actions:** View, Edit, Mark Maintenance, Assign Location, Export.  
**Statuses:** Available, Reserved, Rented, Maintenance, Retired.  

**Detail Fields:**
- Specs (sensor, mount, model, serial).
- Pricing rules (daily/weekly/monthly).
- Depreciation + purchase cost.
- Maintenance history + schedules.
- Attachments (images, manuals).

---

## 8.4 الاستوديوهات (Studios)
**List Columns:** Name, Status, Location, Hourly Rate, Occupancy, Rating.  
**Actions:** View, Edit, Deactivate, Add Package.  

**Detail Fields:**
- مساحة/سعة/ارتفاع.
- تجهيزات ثابتة.
- Media gallery.
- Pricing (hourly/half/full day).
- Availability rules + blackout dates.

---

## 8.5 الفواتير (Invoices)
**List Columns:** Invoice ID, Client, Status, Issue Date, Due Date, Total, Paid.  
**Statuses:** Draft, Sent, Paid, Overdue, Cancelled.  
**Actions:** View, Send, Download PDF, Mark Paid, Void.  

**Detail Fields:**
- Line items + taxes.
- Payment history.
- Dunning schedule.

---

## 8.6 المدفوعات (Payments)
**List Columns:** Payment ID, Booking/Invoice, Amount, Status, Method, Date.  
**Statuses:** Pending, Completed, Failed, Refunded.  
**Actions:** View, Retry, Refund.  

---

## 8.7 العملاء (Clients)
**List Columns:** Client ID, Name, Type, Email, Phone, Total Spend, Last Booking.  
**Actions:** View, Edit, Tag, Export.  

**Detail Tabs:**
- Profile + Contacts.
- Bookings History.
- Invoices/Payments.
- Notes + Communication log.

---

## 8.8 الصيانة (Maintenance)
**List Columns:** Work Order, Equipment, Type, Status, Due Date, Cost.  
**Statuses:** Scheduled, In Progress, Completed, Overdue.  
**Actions:** View, Assign Technician, Close.  

---

## 8.9 المستودع (Warehouse Check‑out/In)
**Check‑out Steps:** Verify client → Inspect equipment → Scan → Document condition → Sign → Handover.  
**Check‑in Steps:** Inspect return → Record damage → Calculate fees → Close booking.  

---

## 8.10 التسويق والكوبونات
**Coupons Fields:** code, type, value, validity, max usage, applicable items.  
**Marketing Campaign Fields:** name, audience, channels, budget, schedule, KPI targets.  

---

# 9) معيار الجودة النهائي (Definition of Done)
- كل صفحة تعيد بيانات حقيقية من API.
- كل إجراء له Confirmation + Error handling.
- كل لائحة تدعم Pagination + Filter + Export.
- كل العمليات الحساسة موثقة في Audit Log.


---

# 10) تحسينات “تخليها تلمع” (Make It Pop)

- **Dashboard:** شريط عمليات اليوم + Insights تلقائية + مقارنة فترات بنقرة واحدة.
- **Action Center:** SLA timers + assignment + تنبيهات فورية.
- **Bookings:** Health flags + timeline مرئي + conflict resolver.
- **Calendar:** Resource heatmap + drag‑drop + conflict suggestions.
- **Inventory:** Utilization heatmap + QR scanning + depreciation charts.
- **Studios:** 3D/Virtual tour + occupancy analytics.
- **Finance:** Cashflow forecast + DSO tracker + aging report.
- **CRM:** Customer 360 + segments + LTV cohort.
- **Marketing:** Campaign ROI dashboard + A/B testing.


# 11) تفاصيل Form‑by‑Form لكل صفحة (حرفيًا)

> **طريقة القراءة:** لكل صفحة أذكر النماذج (Forms) المطلوبة، الحقول، الأزرار، والـ Validation. أي حقل غير مدعوم في الـ DB الحالي مميز بوسم **(DB جديد)**.

---

## A) Command Center

### A1) `/admin/dashboard`
**Forms/Blocks:**
- **Date Range & Compare Form:**
  - `startDate`, `endDate` (required)
  - `preset` (today/7d/30d…)
  - `compareTo` (prev period/year/custom)
- **KPI Cards (read‑only):** Revenue, Bookings, Occupancy, New Clients + Growth
- **Charts Controls:** chartType, granularity, breakdown toggles
- **Quick Actions Panel:** (no form) buttons فقط

**Buttons:** Refresh, Export (CSV/PNG), View Details لكل KPI.

---

### A2) `/admin/dashboard/overview`
**Forms/Blocks:**
- **Widget Library Form:** widgetType, size, dataSource
- **Layout Save Form:** layoutName, defaultToggle

**Buttons:** Add Widget, Save Layout, Reset Default.

---

### A3) `/admin/dashboard/revenue`
**Forms/Blocks:**
- **Filters Form:** dateRange, compareTo, groupBy, revenueType
- **Export Form:** format (PDF/CSV), schedule (daily/weekly)

**Buttons:** Export, Schedule, Print.

---

### A4) `/admin/dashboard/activity`
**Forms/Blocks:**
- **Filters Form:** dateRange, activityType, userId, entityType, entityId

**Buttons:** Export, Live Toggle.

---

### A5) `/admin/dashboard/recent-bookings`
**Forms/Blocks:**
- **Filters Form:** timeframe, status[], type[], sortBy, sortOrder
- **Bulk Actions Form:** actionType (send reminder/export/print)

**Buttons:** Export, Refresh, Bulk Actions.

---

### A6) `/admin/dashboard/quick-actions`
**Blocks:**
- **Command Palette** (no fields)
- **Favorites Manager Form:** add/remove action

---

## B) Action Center & Approvals

### B1) `/admin/action-center`
**Forms/Blocks:**
- **Filters Form:** priority, type, status, assignedTo, dateRange, search
- **Assignment Form:** assignToUser, dueDate
- **Snooze Form:** snoozeUntil, reason

**Buttons:** Approve/Reject, Retry Payment, Contact Client, Mark Done.

---

### B2) `/admin/approvals`
**Forms/Blocks:**
- **Filters Form:** type, status, priority, assignedTo, dateRange
- **Approval Decision Form:** decision (approve/reject), reason/comment, requireMFA

**Buttons:** Approve, Reject, Request Info.

---

### B3) `/admin/live-ops`
**Blocks:**
- Timeline view toggle (day/week)
- Real‑time toggle + refresh interval

---

## C) Booking Engine

### C1) `/admin/quotes` (List)
**Filter Form Fields:** status, dateRange, clientType, amountMin/Max, ownerId
**Table Columns:** Quote #, Client, Status, Dates, Amount, Valid Until, Owner
**Row Actions:** View, Edit, Send, Convert, Archive
**Bulk Actions:** Send, Export, Archive

---

### C2) `/admin/quotes/new` (Wizard)
**Step 1: Client Selection**
- clientId (search) OR
- name, email, phone, type (individual/corporate), companyName (optional), taxNumber (optional)

**Step 2: Items**
- equipment[]: equipmentId, quantity, startDate, endDate, dailyRate
- studio: studioId, date, startTime, endTime
- package: packageId, customizeItems

**Step 3: Pricing**
- discounts: type, value, reason (requires approval if > threshold)
- add‑ons: deliveryFee, insurance, setupFee
- tax: vatRate, vatAmount

**Step 4: Terms**
- deliveryMethod (pickup/delivery)
- deliveryAddress (if delivery)
- cancellationPolicy
- depositRequired + amount

**Buttons:** Save Draft, Preview PDF, Send, Convert to Booking.

---

### C3) `/admin/quotes/[id]`
**Tabs/Blocks:**
- Overview, Items, Pricing, Timeline, Notes
**Buttons:** Send, Accept/Reject, Convert to Booking, Download PDF.

---

### C4) `/admin/bookings` (List)
**Filters:** status, dateRange, type, paymentStatus, deliveryMethod
**Table:** Booking #, Client, Items, Dates, Status, Payment, Amount
**Row Actions:** View, Check‑out, Check‑in, Extend, Cancel

---

### C5) `/admin/bookings/new` (Wizard)
**Client:** clientId أو create client
**Items:** equipment[], studio, packages, add‑ons
**Availability Check:** start/end + conflict resolver
**Pricing:** base + discounts + taxes + deposit
**Payment:** capture deposit / authorization

---

### C6) `/admin/bookings/[id]`
**Tabs:** Overview, Items, Payments, Delivery, Check‑out/in, Timeline
**Buttons:** Extend, Change Request, Refund, Cancel, Generate Invoice

---

### C7) `/admin/calendar`
**Filters:** resourceType (equipment/studio), category, status
**Actions:** Drag‑drop reschedule, Block time

---

### C8) `/admin/change-requests`
**Fields:** bookingId, requestedChanges (dates/items), priceDifference, status
**Buttons:** Approve, Reject, Notify Client

---

### C9) `/admin/extensions`
**Fields:** bookingId, newEndDate, priceDelta
**Buttons:** Approve, Reject

---

### C10) `/admin/availability`
**Filters:** resourceType, category, dateRange
**Actions:** Block/Unblock slots, Export

---

### C11) `/admin/settings/availability-rules`
**Fields:** bufferTime, businessHours, minDuration, maxDuration, blackoutDates (DB جديد)

---

## D) AI & Smart Sales

### D1) `/admin/ai`
**Tabs:** Kit Builder, Import AI, Translation, Q&A, Pricing, Risk, Forecast
**Buttons:** Run Analysis, Export Results

---

### D2) `/admin/kit-builder`
**Fields:** name, items[], recommendedUseCase, pricingTemplate
**Buttons:** Save Kit, Export

---

### D3) `/admin/dynamic-pricing`
**Fields:** strategyType, weights, min/max adjustment, schedule
**Buttons:** Simulate, Activate, Rollback

---

### D4) `/admin/ai-recommendations` / `/admin/recommendations`
**Fields:** triggerItems[], recommendedItems[], discount, placement
**Buttons:** Activate, Pause

---

### D5) `/admin/compatibility`
**Fields:** cameraId, lensId, compatibilityNotes

---

### D6) `/admin/pricing`
**Fields:** equipmentId, dailyRate, weeklyRate, monthlyRate, seasonalRules (DB جديد)

---

### D7) `/admin/discount-rules`
**Fields:** priorityOrder, stackingRules, limits (DB جديد)

---

## E) Packages, Bundles, Offers

### E1) `/admin/packages`
**Fields:** name, type, items[], priceStrategy, minDuration, isActive

### E2) `/admin/bundles`
**Fields:** name, items[], discountPercent, autoSuggestRules

### E3) `/admin/offers`
**Fields:** name, applicableItems, dateRange, discount

---

## F) Inventory & Assets

### F1) `/admin/inventory`
**Blocks:** KPIs + navigation cards

### F2) `/admin/inventory/equipment`
**Filters:** category, brand, status, availability
**Table Columns:** SKU, Name, Category, Brand, Qty, Status, Price

### F3) `/admin/inventory/equipment/new`
**Fields:** sku, model, categoryId, brandId, condition, quantityTotal, prices, specs, media

### F4) `/admin/inventory/equipment/[id]`
**Tabs:** Overview, Pricing, Maintenance, Availability, Media

### F5) `/admin/inventory/categories`
**Fields:** name, slug, parentId, description

### F6) `/admin/inventory/brands`
**Fields:** name, slug, logo, description

### F7) `/admin/inventory/import`
**Fields:** file, sheets, columns mapping

### F8) `/admin/inventory/products`
**Fields:** sku, brand, category, status, pricing

### F9) `/admin/inventory/products/[id]/review`
**Fields:** translatedName, description, specs, approve/reject

---

## G) Studios

### G1) `/admin/studios`
**Filters:** status, capacity, priceRange

### G2) `/admin/studios/new`
**Fields:** name, slug, description, capacity, hourlyRate, buffers, media, blackoutDates

### G3) `/admin/studios/[id]`
**Tabs:** Overview, Pricing, Availability, Media

### G4) `/admin/studios/packages`
**Fields:** name, studioId, duration, includedServices, price

### G5) `/admin/studios/add-ons`
**Fields:** studioId, name, description, price, isActive

---

## H) Operations

### H1) `/admin/ops/warehouse`
**Blocks:** Queue lists + quick actions

### H2) `/admin/ops/warehouse/check-out`
**Steps:** Verify client → Scan items → Condition report → Signature → Handover

### H3) `/admin/ops/warehouse/check-in`
**Steps:** Inspect return → Damage fees → Close booking

### H4) `/admin/ops/warehouse/inventory`
**Fields:** itemId, count, discrepancyReason

### H5) `/admin/ops/delivery`
**Fields:** bookingId, status, driverId

### H6) `/admin/ops/delivery/schedule`
**Fields:** driverId, routeStops[], timeSlots

### H7) `/admin/technicians`
**Fields:** name, skills, availability (DB جديد)

### H8) `/admin/maintenance`
**Fields:** maintenanceNumber, equipmentId, type, status, scheduledDate, technicianId

---

## I) Finance & Legal

### I1) `/admin/invoices`
**Filters:** status, dateRange, customer

### I2) `/admin/invoices/new`
**Fields:** customerId, bookingId, items[], taxes, dueDate

### I3) `/admin/invoices/[id]`
**Blocks:** line items, payment history

### I4) `/admin/payments`
**Fields:** status, bookingId, amount

### I5) `/admin/payments/[id]`
**Blocks:** gateway response, refund button

### I6) `/admin/refunds`
**Fields:** paymentId, amount, reason (DB جديد)

### I7) `/admin/contracts`
**Fields:** bookingId, termsVersion, status

### I8) `/admin/contracts/[id]`
**Fields:** signedAt, signatureData

### I9) `/admin/finance`
**Blocks:** KPIs, cashflow charts

### I10) `/admin/finance/reports`
**Fields:** reportType, dateRange, exportFormat

---

## J) CRM & Marketing

### J1) `/admin/clients`
**Filters:** type, status, segment (DB جديد)

### J2) `/admin/clients/new`
**Fields:** name, email, phone, type, companyName, taxNumber, address

### J3) `/admin/clients/[id]`
**Tabs:** Profile, Bookings, Invoices, Communications

### J4) `/admin/coupons`
**Fields:** status, dateRange

### J5) `/admin/coupons/new`
**Fields:** code, name, type, value, validity, limits

### J6) `/admin/coupons/[id]/analytics`
**KPIs:** usageRate, revenueImpact

### J7) `/admin/marketing`
**Fields:** campaign status filters

### J8) `/admin/marketing/campaigns/new`
**Fields:** name, channel, audience, content, schedule

---

## K) Orders & Wallet

### K1) `/admin/orders`
**Fields:** status, dateRange

### K2) `/admin/orders/new`
**Fields:** clientId, items[], paymentTerms

### K3) `/admin/wallet`
**Fields:** balance, transactions

---

## L) Users & Roles

### L1) `/admin/users`
**Fields:** name, email, role, status

### L2) `/admin/settings/roles`
**Fields:** roleName, permissions[]

---

## M) Settings

### M1) `/admin/settings`
**Blocks:** system health + links

### M2) `/admin/settings/integrations`
**Fields:** provider, apiKey, webhookUrl

### M3) `/admin/settings/features`
**Fields:** featureName, enabled, requiresApproval

### M4) `/admin/settings/ai-control`
**Fields:** provider, apiKey, limits

### M5) `/admin/settings/audit-log`
**Filters:** action, user, dateRange

### M6) `/admin/settings/notifications`
**Fields:** channel, template, enabled

### M7) `/admin/settings/company-profile`
**Fields:** companyName, VAT, address, logo

### M8) `/admin/settings/policies`
**Fields:** cancellationPolicy, lateFee, damageFee

### M9) `/admin/settings/taxes`
**Fields:** vatRate, exemptionRules

### M10) `/admin/settings/security`
**Fields:** MFA, sessionTimeout, IP whitelist

---

## N) System

### N1) `/admin/super`
**Actions:** job rerun, lock release, read‑only toggle

### N2) `/admin/notifications`
**Fields:** read/unread, filters

### N3) `/admin/profile`
**Fields:** name, email, password, MFA


# 12) Backlog تنفيذي بالتقدير والتبعيات

> التقديرات التالية تقريبية (أسابيع تطوير لفريق 2‑3 مطورين). يمكن تحويلها إلى Sprint backlog بسهولة.

| Epic | العناصر الرئيسية | التقدير | التبعيات |
|---|---|---|---|
| **E0 – الأساسيات** | RBAC UI، Audit Log UI، Global Search، Notifications Center | 2–3 أسابيع | User/Permission APIs موجودة جزئيًا |
| **E1 – Calendar & Availability** | Calendar كامل + Availability + Conflict Detection + Rules | 3–4 أسابيع | Booking data + Equipment availability APIs |
| **E2 – Warehouse Ops** | Check‑out/Check‑in flows + Condition reports + Inventory reconciliation | 3–4 أسابيع | Booking + Equipment + Inspection models (جزئي) |
| **E3 – Finance Core** | Invoices create/detail + Payments detail + Refunds + Aging | 3–5 أسابيع | Payments + Invoices APIs موجودة جزئيًا |
| **E4 – Packages/Bundles/Offers** | CRUD + pricing rules + eligibility | 3–4 أسابيع | Pricing rules tables (DB جديد) |
| **E5 – Studios Full** | Studios CRUD + packages + add‑ons + availability | 4–6 أسابيع | Studio models موجودة جزئيًا + AddOns |
| **E6 – Action Center & Approvals** | Action Center + Approvals + Live Ops | 3–5 أسابيع | Events + Audit + SLA rules (DB جديد) |
| **E7 – CRM & Marketing** | Clients detail + Segments + Campaigns full | 3–4 أسابيع | Campaign model موجود جزئيًا |
| **E8 – Inventory Enhancements** | Categories/Brands live + Products + Import history | 2–3 أسابيع | Product/Import tables موجودة |
| **E9 – AI Advanced** | Dynamic Pricing + Recommendations + Forecast | 3–6 أسابيع | AI endpoints موجودة جزئيًا |

**اعتماديات حرجة:**
- **Approvals** تعتمد على RBAC + Audit Log.
- **Refunds** تعتمد على Payments + Invoices detail.
- **Packages/Bundles** تعتمد على Pricing Rules + Product catalog.
- **Availability** تعتمد على Calendar و Equipment availability.


# 13) خريطة APIs المطلوبة لكل صفحة وربطها بالـ DB

**Legend:** [E]=موجود في الكود، [N]=مطلوب إنشاؤه.

## 13.1 Command Center

### `/admin/dashboard`
- **APIs:** [E] `GET /api/reports/dashboard`, [E] `GET /api/reports/revenue`, [E] `GET /api/reports/booking-status`
- **DB:** Booking, Payment, Invoice, Equipment

### `/admin/dashboard/overview`
- **APIs:** [N] `GET /api/dashboard/widgets`
- **DB:** يعتمد على نفس جداول التقارير + SavedViews (DB جديد)

### `/admin/dashboard/revenue`
- **APIs:** [E] `GET /api/reports/revenue`, [E] `GET /api/reports/[type]`, [E] `GET /api/reports/[type]/export`
- **DB:** Invoice, Payment, Booking

### `/admin/dashboard/activity`
- **APIs:** [E] `GET /api/audit-logs` (لـ activity feed)
- **DB:** AuditLog

### `/admin/dashboard/recent-bookings`
- **APIs:** [E] `GET /api/bookings?recent=true`
- **DB:** Booking, BookingEquipment

### `/admin/dashboard/quick-actions`
- **APIs:** لا حاجة (أزرار تنقّل)

---

## 13.2 Action Center & Approvals

### `/admin/action-center`
- **APIs:** [N] `GET /api/action-center` (Aggregator), أو استخدام:
  - [E] `GET /api/approvals/pending`
  - [E] `GET /api/payments?status=FAILED`
  - [E] `GET /api/maintenance?status=OVERDUE`
- **DB:** ApprovalRequest, Payment, Maintenance, Booking

### `/admin/approvals`
- **APIs:** [E] `GET /api/approvals/pending`, [E] `POST /api/approvals/[id]/approve`, [E] `POST /api/approvals/[id]/reject`
- **DB:** ApprovalRequest

### `/admin/live-ops`
- **APIs:** [E] `GET /api/delivery/pending`, [E] `GET /api/warehouse/queue/check-out`, [E] `GET /api/warehouse/queue/check-in`
- **DB:** Delivery, Booking, Equipment

---

## 13.3 Booking Engine

### `/admin/quotes`
- **APIs:** [E] `GET /api/quotes`, [E] `POST /api/quotes`
- **DB:** Quote, QuoteEquipment, User

### `/admin/quotes/new`
- **APIs:** [E] `POST /api/quotes`, [E] `POST /api/quotes/[id]/pdf`
- **DB:** Quote, QuoteEquipment

### `/admin/quotes/[id]`
- **APIs:** [E] `GET /api/quotes/[id]`, [E] `PATCH /api/quotes/[id]`, [E] `POST /api/quotes/[id]/status`, [E] `POST /api/quotes/[id]/convert`, [E] `GET /api/quotes/[id]/pdf`
- **DB:** Quote, QuoteEquipment, Booking

### `/admin/bookings`
- **APIs:** [E] `GET /api/bookings`, [E] `POST /api/bookings`
- **DB:** Booking, BookingEquipment

### `/admin/bookings/new`
- **APIs:** [E] `POST /api/bookings`, [E] `GET /api/equipment/[id]/availability`
- **DB:** Booking, BookingEquipment, Equipment

### `/admin/bookings/[id]`
- **APIs:** [E] `GET /api/bookings/[id]`, [E] `PATCH /api/bookings/[id]`, [E] `POST /api/bookings/[id]/transition`
- **DB:** Booking, Payment, Invoice, Delivery, Inspection

### `/admin/calendar`
- **APIs:** [E] `GET /api/calendar`
- **DB:** Booking, StudioBlackoutDate

### `/admin/change-requests`
- **APIs:** [N] `GET/POST /api/change-requests`
- **DB:** ChangeRequest (DB جديد)

### `/admin/extensions`
- **APIs:** [N] `GET/POST /api/extensions`
- **DB:** BookingExtension (DB جديد)

### `/admin/availability`
- **APIs:** [N] `GET /api/availability`
- **DB:** AvailabilityRules (DB جديد)

### `/admin/settings/availability-rules`
- **APIs:** [N] `GET/PUT /api/settings/availability-rules`
- **DB:** AvailabilityRules (DB جديد)

---

## 13.4 AI & Smart Sales

### `/admin/ai`
- **APIs:** [E] `/api/ai/*` (kit-builder, recommendations, pricing, demand-forecast, risk-assessment, chatbot)
- **DB:** AISettings, AIProcessingJob, ImportJob

### `/admin/kit-builder`
- **APIs:** [E] `POST /api/ai/kit-builder`
- **DB:** (لا يوجد جدول لحفظ kits) → KitTemplates (DB جديد)

### `/admin/dynamic-pricing`
- **APIs:** [E] `POST /api/ai/pricing`
- **DB:** PricingRules/DynamicPricingRules (DB جديد)

### `/admin/ai-recommendations` / `/admin/recommendations`
- **APIs:** [E] `POST /api/ai/recommendations`
- **DB:** RecommendationRules (DB جديد)

### `/admin/compatibility`
- **APIs:** [N] `GET/POST /api/compatibility`
- **DB:** CompatibilityMatrix (DB جديد)

---

## 13.5 Packages / Bundles / Offers

### `/admin/packages`
- **APIs:** [N] `GET/POST /api/packages`
- **DB:** Package, PackageItem (DB جديد)

### `/admin/bundles`
- **APIs:** [N] `GET/POST /api/bundles`
- **DB:** Bundle, BundleItem (DB جديد)

### `/admin/offers`
- **APIs:** [N] `GET/POST /api/offers`
- **DB:** Offer (DB جديد)

---

## 13.6 Inventory & Assets

### `/admin/inventory/equipment`
- **APIs:** [E] `GET /api/equipment`, [E] `POST /api/equipment`
- **DB:** Equipment, Media

### `/admin/inventory/equipment/[id]`
- **APIs:** [E] `GET /api/equipment/[id]`, [E] `PATCH /api/equipment/[id]`
- **DB:** Equipment, Media, Maintenance

### `/admin/inventory/categories`
- **APIs:** [E] `GET/POST /api/categories`
- **DB:** Category

### `/admin/inventory/brands`
- **APIs:** [E] `GET/POST /api/brands`
- **DB:** Brand

### `/admin/inventory/import`
- **APIs:** [E] `/api/admin/imports/*`
- **DB:** ImportJob, ImportJobRow, AIProcessingJob

### `/admin/inventory/products`
- **APIs:** [E] `/api/admin/products/*`
- **DB:** Product, ProductTranslation, InventoryItem

---

## 13.7 Studios

### `/admin/studios`
- **APIs:** [E] `GET/POST /api/studios`
- **DB:** Studio, StudioBlackoutDate, StudioAddOn

### `/admin/studios/packages`
- **APIs:** [N] `GET/POST /api/studio-packages`
- **DB:** StudioPackage (DB جديد)

### `/admin/studios/add-ons`
- **APIs:** [E] `GET/POST /api/studios` (حاليًا فقط) → **يفضل API مستقل** [N] `/api/studio-addons`
- **DB:** StudioAddOn

---

## 13.8 Operations

### `/admin/ops/warehouse`
- **APIs:** [E] `/api/warehouse/queue/check-out`, [E] `/api/warehouse/queue/check-in`
- **DB:** Booking, Equipment

### `/admin/ops/warehouse/check-out`
- **APIs:** [E] `/api/warehouse/check-out`
- **DB:** Inspection (type=check_out), Booking, Equipment

### `/admin/ops/warehouse/check-in`
- **APIs:** [E] `/api/warehouse/check-in`
- **DB:** Inspection (type=check_in), Booking, Equipment

### `/admin/ops/warehouse/inventory`
- **APIs:** [E] `/api/warehouse/inventory`
- **DB:** InventoryItem (ويحتاج جدول WarehouseAdjustment DB جديد)

### `/admin/ops/delivery`
- **APIs:** [E] `/api/delivery/[bookingId]`, [E] `/api/delivery/[bookingId]/status`
- **DB:** Delivery

### `/admin/ops/delivery/schedule`
- **APIs:** [E] `/api/delivery/schedule`
- **DB:** Delivery + RoutePlan (DB جديد)

### `/admin/technicians`
- **APIs:** [E] `/api/technicians`
- **DB:** User (role=TECHNICIAN) + TechnicianProfile (DB جديد)

### `/admin/maintenance`
- **APIs:** [E] `/api/maintenance`, [E] `/api/maintenance/[id]`
- **DB:** Maintenance

---

## 13.9 Finance & Legal

### `/admin/invoices`
- **APIs:** [E] `/api/invoices`, [E] `/api/invoices/generate/[bookingId]`
- **DB:** Invoice

### `/admin/invoices/[id]`
- **APIs:** [E] `/api/invoices/[id]`, [E] `/api/invoices/[id]/pdf`, [E] `/api/invoices/[id]/payment`
- **DB:** Invoice, InvoicePayment

### `/admin/payments`
- **APIs:** [E] `/api/payments`
- **DB:** Payment

### `/admin/payments/[id]`
- **APIs:** [E] `/api/payments/[id]`, [E] `/api/payments/[id]/refund`
- **DB:** Payment, ApprovalRequest

### `/admin/refunds`
- **APIs:** [N] `/api/refunds`
- **DB:** Refund (DB جديد) أو استخدام Payment.refundAmount + AuditLog

### `/admin/contracts`
- **APIs:** [E] `/api/contracts`
- **DB:** Contract

### `/admin/contracts/[id]`
- **APIs:** [E] `/api/contracts/[id]`, [E] `/api/contracts/[id]/sign`, [E] `/api/contracts/[id]/pdf`
- **DB:** Contract

---

## 13.10 CRM & Marketing

### `/admin/clients`
- **APIs:** [E] `/api/clients`, [E] `/api/clients/[id]`
- **DB:** User (customer)

### `/admin/clients/[id]`
- **APIs:** [E] `/api/clients/[id]`
- **DB:** User + Booking + Invoice

### `/admin/coupons`
- **APIs:** [E] `/api/coupons`, [E] `/api/coupons/[id]`, [E] `/api/coupons/validate`
- **DB:** Coupon

### `/admin/marketing`
- **APIs:** [E] `/api/marketing/campaigns`
- **DB:** Campaign

### `/admin/marketing/campaigns/[id]`
- **APIs:** [E] `/api/marketing/campaigns/[id]`, [E] `/api/marketing/campaigns/[id]/send`
- **DB:** Campaign

---

## 13.11 Settings & System

### `/admin/settings/integrations`
- **APIs:** [E] `/api/integrations`, `/api/integrations/[type]`, `/api/integrations/[type]/test`
- **DB:** IntegrationConfig

### `/admin/settings/features`
- **APIs:** [E] `/api/feature-flags`, `/api/feature-flags/[id]`
- **DB:** FeatureFlag

### `/admin/settings/roles` & `/admin/users`
- **APIs:** [E] `/api/user/permissions`, `/api/users`
- **DB:** User, Permission, UserPermission

### `/admin/settings/audit-log`
- **APIs:** [E] `/api/audit-logs`
- **DB:** AuditLog

### `/admin/settings/ai-control`
- **APIs:** [E] `/api/admin/settings/ai`
- **DB:** AISettings

### `/admin/notifications`
- **APIs:** [N] `/api/notifications`
- **DB:** Notification


# 14) فجوات قاعدة البيانات (DB Gap Matrix)

**الجداول المطلوبة غير الموجودة حاليًا:**
- `Package`, `PackageItem`
- `Bundle`, `BundleItem`
- `Offer`
- `PricingRule`, `SeasonalPricingRule`
- `DiscountRule`
- `AvailabilityRule`, `BlackoutRule`
- `ChangeRequest`
- `BookingExtension`
- `Refund`
- `StudioPackage`
- `RecommendationRule`
- `CompatibilityMatrix`
- `WarehouseTransaction` (check‑in/out)
- `WarehouseAdjustment` (inventory reconciliation)
- `RoutePlan` (delivery scheduling)
- `TechnicianProfile` (skills/availability)
- `CustomerProfile` + `CustomerTag` + `CustomerSegment`
- `ActionItem` (Action Center queue)
- `SavedView` (dashboard widgets layout)
- `NotificationTemplate`

**تعديلات مقترحة على جداول موجودة:**
- `Booking`: إضافة `type` (equipment/studio/mixed) + `guest` flag.
- `Payment`: إضافة `method` + `gatewayResponse`.
- `Studio`: إضافة `location`, `media`, `pricing tiers` (قد تُخزن في JSON).


# 15) تدقيق ثاني (Second‑Pass) + نتائج جديدة

**تاريخ التدقيق الثاني:** 2026‑01‑30  
**مصادر التدقيق:** الكود الفعلي + الروابط الداخلية + ملفات `PRD.md` و `BOOKING_ENGINE.md` و `ROLES_AND_SECURITY.md` و `DATA_EVENTS.md`.

## 15.1 صفحات مذكورة في UI ولم تكن موثّقة بالكامل
- **/admin/users/[id]**: موجود كرابط من صفحة المستخدمين، غير مذكور سابقًا كصفحة مطلوبة.
- **/admin/technicians/[id]**: رابط من صفحة الفنيين، غير مذكور سابقًا كصفحة مطلوبة.
- **/admin/studios/[id]**: رابط من صفحة الاستوديوهات (تمت إضافته، أكدنا ضرورته).
- **Anchors في Dashboard**: روابط `#overview`, `#revenue`, `#recent-bookings`, `#recent-activity`, `#quick-actions` يجب أن تعمل فعليًا بإضافة IDs مناسبة في الصفحة الرئيسية.

## 15.2 عدم تطابق UI ↔ API
- صفحة مراجعة المنتجات تستخدم **`POST /api/admin/products/[id]/retry-ai`** لكن **لا يوجد Route فعلي** لهذه الـ API. لازم إضافته.
- صفحة المستخدمين والفنيين تحتاج **GET/PUT /api/users/[id]** و **/api/technicians/[id]** (غير موجودين).
- صفحة المحفظة تحتاج **/api/wallet/[id]** لتفاصيل المعاملة (غير موجود).
- صفحة الطلبات تحتاج **/api/orders/[id]** لتفاصيل الطلب (غير موجود).

## 15.3 متطلبات سياسة النظام من PRD/BOOKING_ENGINE (إلزامي)
- **لا يوجد Guest Checkout** (Registration required). أي دعم للـ Guest يجب أن يكون Feature Flag واضح أو يُزال.
- **لا Booking بدون دفع**: لا تتحول الحالة إلى CONFIRMED إلا بعد الدفع.
- **Risk Check**: هناك مرحلة RISK_CHECK يجب أن يكون لها **Queue** للمراجعة + قرار (Approve/Reject/Request info).
- **Soft Lock TTL**: يجب عرض وإدارة Locks (تمت الإشارة إلى زر Release في Super Admin؛ نحتاج قائمة Locks فعلية).
- **Contract Acceptance**: التوقيع ونسخة العقد يجب أن تكون جزءًا من صفحة الحجز.
- **VAT ثابت 15%** حسب PRD.

## 15.4 متطلبات أمنية إلزامية من ROLES_AND_SECURITY
- **No Admin Bypass**: كل العمليات تمر عبر Policies (واجهة/توثيق في النظام).
- **Financial Operations = Approval Workflow**: أي Refund/Discount خارج الحدود يمر بالموافقات.
- **Soft Delete Only**: يجب توفير UI يوضح حذف منطقي مع Audit.
- **Rate Limiting + MFA** كإعدادات إلزامية.

## 15.5 أحداث النظام (Event System) ناقصة في الـ UI
- إضافة صفحة **/admin/events** أو تبويب في الـ Super Admin يعرض Event log + replay.
- ربط Action Center بالأحداث الحرجة (payment.failed, booking.cancelled...).

---

# 16) إضافات لازمة لتكتمل اللوحة (Enterprise Completeness)

> هذه الإضافات غير موجودة في الكود لكنها مطلوبة لكي تكون لوحة التحكم “كاملة” بمعايير شركة قديمة.

## 16.1 Vendor & Procurement
**صفحات جديدة:**
- `/admin/vendors`
- `/admin/vendors/[id]`
- `/admin/purchase-orders`
- `/admin/purchase-orders/new`
- `/admin/purchase-orders/[id]`

**النماذج:** Vendor create/edit (name, contact, terms) + PO create (items, qty, cost, expected date).

## 16.2 Stock Transfers & Multi‑Location
**صفحات جديدة:**
- `/admin/warehouses`
- `/admin/warehouses/[id]`
- `/admin/stock-transfers`

**النماذج:** transfer items بين المواقع + أسباب التحويل.

## 16.3 Damage & Insurance
**صفحات جديدة:**
- `/admin/damage-reports`
- `/admin/insurance/policies`
- `/admin/insurance/claims`

**النماذج:** damage report مرتبط بحجز + claim tracker.

## 16.4 Support Tickets
**صفحات جديدة:**
- `/admin/support/tickets`
- `/admin/support/tickets/[id]`

**النماذج:** ticket create + SLA + assignments.

## 16.5 Staff Scheduling
**صفحات جديدة:**
- `/admin/staff/shifts`
- `/admin/staff/availability`

## 16.6 Templates & Document Management
**صفحات جديدة:**
- `/admin/settings/templates` (contracts, invoices, email templates)
- `/admin/settings/documents` (upload waivers, SOPs)

---

# 17) تحديثات لازمة في قسم Form‑by‑Form (إضافات)

## 17.1 `/admin/users/[id]`
- Tabs: Profile, Roles, Activity, Permissions, Sessions.
- Actions: Reset password, Suspend, Assign role.

## 17.2 `/admin/technicians/[id]`
- Tabs: Profile, Skills, Assigned Jobs, Availability.

## 17.3 `/admin/events`
- Filters: eventName, resourceType, status, dateRange.
- Actions: Replay event, Inspect payload.

---

# 18) تحديثات لازمة في API Map

- [N] `GET/PUT /api/users/[id]`
- [N] `GET/PUT /api/technicians/[id]`
- [N] `GET /api/wallet/[id]`
- [N] `GET /api/orders/[id]`
- [N] `POST /api/admin/products/[id]/retry-ai`
- [N] `GET /api/events` + `POST /api/events/[id]/replay`
- [N] Vendor/PO APIs: `/api/vendors`, `/api/purchase-orders`, `/api/stock-transfers`

---

# 19) تحديثات DB Gap Matrix (إضافات)

- `Vendor`, `VendorContact`
- `PurchaseOrder`, `PurchaseOrderItem`
- `Warehouse`, `StockTransfer`, `StockTransferItem`
- `DamageReport`, `InsurancePolicy`, `InsuranceClaim`
- `SupportTicket`
- `StaffShift`, `StaffAvailability`
- `EventReplay`


# 20) دمج وثيقة Enterprise Sidebar Sitemap (DOCX) — مصفوفة المطابقة

> **هذه الوثيقة أصبحت مرجعًا إضافيًا رسميًا.** أي صفحة/تبويب مذكور فيها يُعتبر إلزاميًا حتى لو لم يُذكر سابقًا.

## 20.1 صفحات/تبويبات جديدة لم تكن مضافة سابقًا (حسب DOCX)

**Command Center**
- `/admin/dashboard/finance`
- `/admin/dashboard/bookings`
- `/admin/dashboard/health`
- `/admin/dashboard/ai-forecast`
- `/admin/action-center/tasks`
- `/admin/action-center/contracts-pending`
- `/admin/action-center/low-stock`
- `/admin/action-center/risk-queue`
- `/admin/approvals/refunds`
- `/admin/approvals/invoice-edits`
- `/admin/approvals/discounts`
- `/admin/approvals/policies`
- `/admin/live-ops/drivers`
- `/admin/live-ops/dispatch`
- `/admin/live-ops/active-bookings-map`

**Booking Engine**
- `/admin/quotes/{id}/activity`
- `/admin/quotes/{id}/send`
- `/admin/quotes/{id}/convert`
- `/admin/bookings/view/{id}` + تبويباته:
  - `/summary`, `/items`, `/schedule`, `/payments`, `/contract`, `/delivery`, `/returns`, `/notes`, `/audit`
- `/admin/calendar/equipment`
- `/admin/calendar/studios`
- `/admin/calendar/crew`
- `/admin/calendar/conflicts`

**Smart Sales Tools**
- `/admin/sales/kit-builder`
- `/admin/sales/kit-builder/rules`
- `/admin/sales/compatibility`
- `/admin/sales/compatibility/library`

**Inventory & Assets**
- `/admin/inventory/items`
- `/admin/inventory/items/list`
- `/admin/inventory/items/new`
- `/admin/inventory/items/{id}`
- `/admin/inventory/items/{id}/media`
- `/admin/inventory/items/{id}/condition`
- `/admin/inventory/items/{id}/pricing`
- `/admin/inventory/items/{id}/availability`
- `/admin/inventory/items/compare`
- `/admin/inventory/studios`
- `/admin/inventory/studios/list`
- `/admin/inventory/studios/{id}`
- `/admin/inventory/studios/{id}/slots`
- `/admin/inventory/studios/{id}/buffers`
- `/admin/inventory/studios/{id}/addons`
- `/admin/inventory/studios/{id}/gallery`
- `/admin/inventory/sub-rent`
- `/admin/inventory/sub-rent/suppliers`
- `/admin/inventory/sub-rent/suppliers/{id}`
- `/admin/inventory/sub-rent/requests`
- `/admin/inventory/sub-rent/sla-fallback`
- `/admin/inventory/bundles`
- `/admin/inventory/bundles/static`
- `/admin/inventory/bundles/dynamic`
- `/admin/inventory/bundles/{id}`
- `/admin/inventory/import/new`
- `/admin/inventory/import/mapping`
- `/admin/inventory/import/validate`
- `/admin/inventory/import/enrich`
- `/admin/inventory/import/review`
- `/admin/inventory/import/sessions`
- `/admin/inventory/import/sessions/{id}`
- `/admin/inventory/import/qr-generator`
- `/admin/inventory/import/templates`

**Operations & Logistics**
- `/admin/ops/warehouse/checkout`
- `/admin/ops/warehouse/checkin`
- `/admin/ops/warehouse/damages`
- `/admin/ops/warehouse/locks`
- `/admin/ops/warehouse/packing-list`
- `/admin/ops/maintenance`
- `/admin/ops/maintenance/logs`
- `/admin/ops/maintenance/schedule`
- `/admin/ops/maintenance/predictive`
- `/admin/ops/maintenance/items/{id}`
- `/admin/ops/logistics`
- `/admin/ops/logistics/schedule`
- `/admin/ops/logistics/drivers`
- `/admin/ops/logistics/vehicles`
- `/admin/ops/logistics/routes`
- `/technician-portal`
- `/technician-portal/tasks`
- `/technician-portal/task/{id}`
- `/technician-portal/checklist`
- `/technician-portal/scan`

**Finance & Legal**
- `/admin/finance/invoices`
- `/admin/finance/invoices/list`
- `/admin/finance/invoices/{id}`
- `/admin/finance/invoices/{id}/notes`
- `/admin/finance/invoices/{id}/audit`
- `/admin/finance/invoices/zatca`
- `/admin/finance/deposits`
- `/admin/finance/deposits/policies`
- `/admin/finance/deposits/transactions`
- `/admin/finance/deposits/ai-suggestion`
- `/admin/finance/contracts`
- `/admin/finance/contracts/templates`
- `/admin/finance/contracts/templates/{id}`
- `/admin/finance/contracts/signatures`
- `/admin/finance/contracts/signatures/{id}`
- `/admin/finance/contracts/legal-versioning`
- `/admin/finance/pricing`
- `/admin/finance/pricing/rules`
- `/admin/finance/pricing/dynamic`
- `/admin/finance/pricing/weekend`
- `/admin/finance/pricing/overrides`

**CRM & Marketing**
- `/admin/clients/list`
- `/admin/clients/{id}/kyc`
- `/admin/clients/{id}/risk`
- `/admin/clients/{id}/bookings`
- `/admin/clients/{id}/invoices`
- `/admin/clients/blacklist`
- `/admin/marketing/pixels`
- `/admin/marketing/abandoned`
- `/admin/marketing/coupons`
- `/admin/marketing/campaigns`
- `/admin/communication`
- `/admin/communication/email-templates`
- `/admin/communication/whatsapp-bot`
- `/admin/communication/notifications`

**Settings & Developer**
- `/admin/settings/feature-toggles`
- `/admin/settings/feature-toggles/modules`
- `/admin/settings/feature-toggles/experiments`
- `/admin/settings/integrations/tap`
- `/admin/settings/integrations/whatsapp`
- `/admin/settings/integrations/analytics`
- `/admin/settings/integrations/api`
- `/admin/settings/integrations/webhooks`
- `/admin/settings/integrations/health`
- `/admin/settings/security`
- `/admin/settings/security/roles`
- `/admin/settings/security/permissions`
- `/admin/settings/security/audit-logs`
- `/admin/settings/security/2fa`
- `/admin/settings/security/sessions`
- `/admin/settings/forms`
- `/admin/settings/forms/fields`
- `/admin/settings/forms/logic`
- `/admin/settings/forms/templates`
- `/admin/ai/logs`
- `/admin/ai/logs/pricing`
- `/admin/ai/logs/risk`
- `/admin/ai/logs/deposits`
- `/admin/ai/logs/recommendations`
- `/admin/legal/versions`
- `/admin/legal/versions/list`
- `/admin/legal/versions/{id}`
- `/admin/legal/versions/attach-to-booking`

**Frontend + Portal + CMS** (منظومة كاملة)
- `/rent`, `/studios`, `/build-your-kit`
- `/portal/dashboard`, `/portal/bookings`, `/portal/invoices`, `/portal/contracts/sign/{id}`
- `/admin/cms/pages`, `/admin/cms/tutorials`, `/admin/cms/translations`

**Enterprise Add‑ons**
- `/admin/reports`, `/admin/reports/financial-summary`, `/admin/reports/utilization`, `/admin/reports/losses-damages`, `/admin/reports/ai-performance`
- `/admin/system/incidents`, `/admin/system/incidents/live`, `/admin/system/incidents/history`, `/admin/system/incidents/auto-recovery-log`
- `/admin/exceptions`, `/admin/exceptions/overbooked`, `/admin/exceptions/late-returns`, `/admin/exceptions/manual-overrides`
- `/admin/settings/data`, `/admin/settings/data/retention`, `/admin/settings/data/anonymization`, `/admin/settings/data/exports`
- `/admin/system/emergency`

---

## 20.2 تضارب المسارات مع الكود الحالي (يجب حسمه)

**مثال:**
- DOCX: `/admin/finance/invoices`  ⟷  الكود: `/admin/invoices`
- DOCX: `/admin/ops/maintenance`  ⟷  الكود: `/admin/maintenance`
- DOCX: `/admin/sales/kit-builder` ⟷ الكود: `/admin/ai` + `/admin/kit-builder`

**قرار لازم:**
- إما **اعتماد مسارات DOCX** كمرجع نهائي، وإنشاء Redirects من المسارات القديمة.
- أو **تعديل DOCX** رسميًا ليتطابق مع الهيكل الحالي. (غير مفضل لأنه المرجع الرسمي).

---

# 21) متطلبات إضافية مستخلصة من DOCX (Feature Completeness)

- **ZATCA Compliance** في الفواتير + شاشة حالة التكامل.
- **KYC + Risk Score + Blacklist** لملفات العملاء.
- **Abandoned Checkout** مع حملات استرجاع تلقائية.
- **Compatibility Rules Library** لنظام العدسات/الكاميرات.
- **Soft Locks Panel** في المستودع.
- **Packing List** قابلة للطباعة.
- **AI Explainability Logs** لكل قرارات الذكاء الاصطناعي.
- **Forms Engine** لبناء نماذج ديناميكية (Logic Builder).
- **Legal Versions** وربط كل حجز بنسخة شروط ثابتة.
- **Incident & Emergency Mode** لإدارة تعطل الدفع/الأنظمة.
- **Executive Reports** منفصلة عن تقارير التشغيل اليومية.

---

# 22) إضافات مطلوبة في Backlog بناءً على DOCX

- **E10 – Route Alignment** (تحويل مسارات النظام لتطابق DOCX + Redirects) — 1‑2 أسبوع.
- **E11 – Finance ZATCA** (Invoice compliance + status page) — 2‑3 أسابيع.
- **E12 – KYC/Risk/Blacklist** — 2‑3 أسابيع.
- **E13 – Communication Hub** (Email templates + WhatsApp bot + notifications rules) — 2‑4 أسابيع.
- **E14 – Incidents/Emergency** — 1‑2 أسبوع.
- **E15 – Executive Reports** — 2‑3 أسابيع.
- **E16 – Forms Engine** — 3‑4 أسابيع.

---

# 23) تحديثات DB Gap Matrix (بناءً على DOCX)

**جداول إضافية مطلوبة:**
- `KYCRecord`, `RiskAssessment`, `BlacklistEntry`
- `LegalVersion`, `ContractTemplate`
- `CommunicationTemplate`, `NotificationRule`
- `Incident`, `EmergencyModeState`
- `ReportSnapshot`
- `WarehouseLock`
- `PackingList`
- `SubRentSupplier`, `SubRentRequest`, `SlaFallbackRule`
- `Vehicle`, `DriverProfile`
- `FormsField`, `FormsLogic`, `FormsTemplate`


# 24) النسخة الرسمية: Full System

> **نسخة Full System نهائية وكاملة end‑to‑end.**


## 24.1 النسخة (Full System) – النظام الكامل المتكامل
**النطاق:** كل ما في النسخة A + الواجهة العامة + بوابة العميل + CMS.

**تشمل بالإضافة إلى A:**
- **Public Website**: `/rent`, `/studios`, `/build-your-kit`.
- **Client Portal**: `/portal/dashboard`, `/portal/bookings`, `/portal/invoices`, `/portal/contracts/sign/{id}`.
- **CMS Admin**: `/admin/cms/pages`, `/admin/cms/tutorials`, `/admin/cms/translations`.

**نتيجة النسخة B:** نظام مؤسسي شامل end‑to‑end بدون أي فجوات.

---

# 25) قرار مسارات نهائي (Canonical Routing)

**المرجع الرسمي للمسارات:** وثيقة `Enterprise_Sidebar_Sitemap_Complete.docx`.  
**التنفيذ المطلوب:** اعتماد مسارات DOCX كـ Canonical، وإنشاء Redirects للمسارات القديمة.

**أمثلة قرار المسار:**
- `/admin/invoices` → **Redirect** إلى `/admin/finance/invoices`
- `/admin/maintenance` → **Redirect** إلى `/admin/ops/maintenance`
- `/admin/kit-builder` → **Redirect** إلى `/admin/sales/kit-builder`

> هذا القرار يمنع التضارب ويجعل الوثيقة المرجعية هي المصدر النهائي.

---

# 26) Definition of Done (لا يسمح بترك أي فجوة)

✅ **كل صفحة مذكورة في الأقسام 20 و24 تعمل وتعرض بيانات حقيقية.**  
✅ **كل تبويب له بيانات وأزرار فعّالة.**  
✅ **كل قائمة فيها Search + Filters + Pagination + Export + Bulk Actions.**  
✅ **كل عملية مالية تمر عبر موافقات وأثر تدقيقي (Audit).**  
✅ **كل الروابط الداخلية والـ CTA تعمل بدون 404.**  
✅ **كل Feature Flag له أثر واضح وسجل تغييرات.**  
✅ **كل إجراءات الذكاء الاصطناعي موثقة في AI Logs.**  
✅ **كل صلاحية محكومة بالـ Policies (No Admin Bypass).**

**بعد استيفاء البنود أعلاه، لا يوجد أي تحسين إلزامي متبقّي.**

