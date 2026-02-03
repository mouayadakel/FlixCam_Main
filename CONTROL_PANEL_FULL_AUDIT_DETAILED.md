# تقرير تدقيق شامل ومفصل لكل صفحات لوحة التحكم (Control Panel)

التاريخ: 2026-01-28  
النطاق: كل صفحات مسار `/admin` (بما فيها الروابط الموجودة في الـ Sidebar والصفحات الفرعية والروابط المشار إليها داخل الصفحات).  
الهدف: وصف **كل صفحة** بالتفصيل (الميزات/البيانات/الحالات) + ذكر **العيوب والنواقص** بدقة، مع عدم ترك أي صفحة أو رابط داخلي بلا ملاحظة.

---

## 0) فهرس شامل بكل الصفحات + حالتها

المفاتيح:
- الحالة: **LIVE** (مرتبطة بـ APIs حقيقية) | **MOCK/PLACEHOLDER** (بيانات ثابتة/نموذجية) | **MISSING** (الصفحة غير موجودة)
- البيانات: **API** | **DB** | **Mock** | **None**

| المسار | الحالة | البيانات | ملاحظات مختصرة |
|---|---|---|---|
| /admin | LIVE | None | Redirect إلى /admin/dashboard |
| /admin/dashboard | LIVE | DB | KPIs + Charts + Recent Bookings |
| /admin/dashboard/overview | PLACEHOLDER | None | صفحة مؤقتة |
| /admin/dashboard/revenue | PLACEHOLDER | None | صفحة مؤقتة |
| /admin/dashboard/activity | PLACEHOLDER | None | صفحة مؤقتة |
| /admin/dashboard/recent-bookings | PLACEHOLDER | None | صفحة مؤقتة |
| /admin/dashboard/quick-actions | PLACEHOLDER | None | صفحة مؤقتة |
| /admin/action-center | MISSING | None | موجود في الـ sidebar لكنه غير منفّذ |
| /admin/approvals | MISSING | None | موجود في الـ sidebar لكنه غير منفّذ (API موجود) |
| /admin/live-ops | MISSING | None | موجود في الـ sidebar لكنه غير منفّذ |
| /admin/quotes | LIVE | API | قائمة عروض الأسعار |
| /admin/quotes/[id] | LIVE | API | تفاصيل عرض السعر |
| /admin/quotes/new | MISSING | None | رابط موجود في صفحات أخرى |
| /admin/bookings | LIVE | API | قائمة الحجوزات |
| /admin/bookings/new | LIVE | API | إنشاء حجز جديد |
| /admin/bookings/[id] | LIVE | API | تفاصيل حجز + State Machine |
| /admin/calendar | PLACEHOLDER | Mock | جدول + تقويم وهمي |
| /admin/ai | LIVE | API | تبويبات AI متعددة |
| /admin/kit-builder | MISSING | None | رابط في الـ sidebar (الوظيفة داخل /admin/ai فقط) |
| /admin/dynamic-pricing | MISSING | None | رابط في الـ sidebar |
| /admin/ai-recommendations | MISSING | None | رابط في الـ sidebar |
| /admin/inventory | PLACEHOLDER | None | صفحة تنقل داخل المخزون |
| /admin/inventory/equipment | LIVE | API | قائمة المعدات مع فلاتر |
| /admin/inventory/equipment/new | LIVE | API | إنشاء معدة (نموذج متكامل) |
| /admin/inventory/equipment/[id] | LIVE | API | تفاصيل معدة |
| /admin/inventory/equipment/[id]/edit | LIVE | API | تعديل معدة |
| /admin/inventory/categories | PLACEHOLDER | Mock | بيانات ثابتة |
| /admin/inventory/brands | MISSING | None | رابط في الـ sidebar |
| /admin/inventory/import | LIVE | API | استيراد Excel مع AI Preview |
| /admin/inventory/products | MISSING | None | مذكور في breadcrumbs |
| /admin/inventory/products/[id]/review | LIVE | API | مراجعة منتج بعد AI |
| /admin/studios | PLACEHOLDER | Mock | إدارة استوديوهات (بيانات ثابتة) |
| /admin/ops/warehouse | LIVE | API | طوابير الإخراج/الإرجاع |
| /admin/ops/warehouse/check-out | MISSING | None | رابط داخل صفحة المستودع |
| /admin/ops/warehouse/check-in | MISSING | None | رابط داخل صفحة المستودع |
| /admin/ops/warehouse/inventory | MISSING | None | رابط داخل صفحة المستودع |
| /admin/ops/delivery | LIVE | API | إدارة التوصيل |
| /admin/ops/delivery/schedule | MISSING | None | رابط داخل صفحة التوصيل |
| /admin/technicians | PLACEHOLDER | Mock | قائمة فنيين وهمية |
| /admin/maintenance | LIVE | API | إدارة الصيانة |
| /admin/invoices | LIVE | API | قائمة الفواتير |
| /admin/invoices/new | MISSING | None | رابط موجود في قائمة الفواتير |
| /admin/invoices/[id] | MISSING | None | رابط موجود في قائمة الفواتير |
| /admin/payments | LIVE | API | قائمة المدفوعات |
| /admin/payments/[id] | MISSING | None | رابط موجود في قائمة المدفوعات |
| /admin/contracts | LIVE | API | قائمة العقود |
| /admin/contracts/[id] | MISSING | None | رابط موجود في قائمة العقود |
| /admin/finance | PLACEHOLDER | Mock | تبويب فواتير/مدفوعات (بيانات ثابتة) |
| /admin/finance/reports | LIVE (جزئي) | API | تقارير + JSON خام |
| /admin/clients | LIVE | API | قائمة العملاء |
| /admin/clients/new | MISSING | None | رابط موجود في صفحة العملاء |
| /admin/clients/[id] | MISSING | None | رابط موجود في صفحة العملاء |
| /admin/coupons | LIVE | API | قائمة الكوبونات |
| /admin/coupons/new | MISSING | None | رابط موجود في صفحة الكوبونات |
| /admin/coupons/[id] | MISSING | None | رابط موجود في صفحة الكوبونات |
| /admin/marketing | LIVE | API | قائمة الحملات |
| /admin/marketing/campaigns/new | MISSING | None | رابط موجود في صفحة التسويق |
| /admin/marketing/campaigns/[id] | MISSING | None | رابط موجود في صفحة التسويق |
| /admin/settings | PLACEHOLDER | None | بوابة إعدادات فقط |
| /admin/settings/integrations | LIVE | API | تكوين التكاملات + اختبار اتصال |
| /admin/settings/features | LIVE | API | Feature Flags + Audit |
| /admin/settings/roles | PLACEHOLDER | Mock | أدوار ثابتة |
| /admin/settings/roles/[id] | PLACEHOLDER | Mock | تفاصيل الدور والـ permissions ثابتة |
| /admin/settings/ai-control | LIVE (جزئي) | API | إعدادات AI + Analytics |
| /admin/users | PLACEHOLDER | Mock | قائمة مستخدمين وهمية |
| /admin/orders | LIVE | API | قائمة الطلبات |
| /admin/orders/new | MISSING | None | رابط موجود في صفحة الطلبات |
| /admin/orders/[id] | MISSING | None | رابط موجود في صفحة الطلبات |
| /admin/wallet | PLACEHOLDER | Mock | محفظة/رصيد وهمي |
| /admin/wallet/[id] | MISSING | None | رابط موجود في صفحة المحفظة |
| /admin/super | LIVE | API | أدوات Super Admin |
| /admin/notifications | MISSING | None | رابط في الهيدر |
| /admin/profile | MISSING | None | رابط في الهيدر |

---

## 1) تفاصيل الصفحات – مع الميزات والعيوب

### 1.1 /admin (Admin Index)
- **الملف:** `src/app/admin/page.tsx`
- **الهدف:** إعادة توجيه تلقائي للوحة التحكم.
- **الميزات:** Redirect مباشر إلى `/admin/dashboard`.
- **العيوب/النواقص:**
  - لا يوجد فحص صلاحيات أو صفحة ترحيبية.
  - لا يوجد handling لحالات عدم السماح بالدخول (مفترض في الـ middleware فقط).

---

### 1.2 /admin/dashboard (Dashboard الرئيسي)
- **الملف:** `src/app/admin/dashboard/page.tsx`
- **مصادر البيانات:** Prisma/DB (`payment`, `booking`, `equipment`, `bookingEquipment`).
- **الميزات الأساسية:**
  - 4 KPI Cards: الإيرادات الشهرية، عدد الحجوزات، نسبة الإشغال، عملاء جدد.
  - Charts: RevenueChart (30 يوم) + BookingStateChart (توزيع الحالات).
  - جدول آخر الحجوزات.
  - أزرار سريعة: إنشاء حجز/عرض سعر جديد.
  - حسابات فعلية من DB (وليس Mock).
- **الحالات:**
  - Loading عبر `Suspense` و `Skeleton`.
  - في حال فشل الاستعلامات: أرقام 0.
- **العيوب/النواقص:**
  - المقارنات (+12% وغيرها) ثابتة وليست مبنية على بيانات حقيقية.
  - لا يوجد Date Range Selector أو مقارنة MoM/YoY.
  - لا يوجد Drill-down من الكروت/التشارت إلى صفحات قائمة.
  - لا يوجد تحذيرات تلقائية (مدفوعات فاشلة، صيانة متأخرة، نقص مخزون).
  - التحليلات غير مقسمة حسب فئة/مدينة/قناة.

---

### 1.3 صفحات Dashboard الفرعية (Placeholders)

#### /admin/dashboard/overview
- **الملف:** `src/app/admin/(routes)/dashboard/overview/page.tsx`
- **الميزات:** عنوان + Breadcrumbs + نص Placeholder.
- **العيوب:** لا يوجد أي بيانات أو Widgets.

#### /admin/dashboard/revenue
- **الملف:** `src/app/admin/(routes)/dashboard/revenue/page.tsx`
- **الميزات:** Placeholder لفكرة الإيرادات.
- **العيوب:** لا يوجد Charts ولا بيانات فعلية.

#### /admin/dashboard/activity
- **الملف:** `src/app/admin/(routes)/dashboard/activity/page.tsx`
- **الميزات:** Placeholder لنشاط النظام.
- **العيوب:** لا يوجد Feed أو Events.

#### /admin/dashboard/recent-bookings
- **الملف:** `src/app/admin/(routes)/dashboard/recent-bookings/page.tsx`
- **الميزات:** Placeholder لقائمة الحجوزات الأخيرة.
- **العيوب:** لا يوجد ربط ببيانات.

#### /admin/dashboard/quick-actions
- **الملف:** `src/app/admin/(routes)/dashboard/quick-actions/page.tsx`
- **الميزات:** Placeholder لاختصارات.
- **العيوب:** لا يوجد أزرار فعلية.

---

### 1.4 /admin/action-center (MISSING)
- **الحالة:** غير منفّذة.
- **العيوب:** الرابط موجود في الـ sidebar لكن الصفحة غير موجودة.

### 1.5 /admin/approvals (MISSING)
- **الحالة:** غير منفّذة.
- **معلومة مهمة:** يوجد API فعلي `/api/approvals/...` لكن لا يوجد UI.

### 1.6 /admin/live-ops (MISSING)
- **الحالة:** غير منفّذة.
- **العيوب:** لا يوجد Live Operations board.

---

## 2) Booking Engine

### 2.1 /admin/quotes (قائمة عروض الأسعار)
- **الملف:** `src/app/admin/(routes)/quotes/page.tsx`
- **مصادر البيانات:** `GET /api/quotes` مع فلاتر status + pagination.
- **الميزات:**
  - بحث بالرقم أو العميل.
  - فلتر الحالة (draft/sent/accepted/...)
  - جدول يحتوي: رقم العرض، العميل، الحالة، التواريخ، المبلغ، صلاحية.
  - تحويل العرض إلى حجز.
  - زر إنشاء عرض جديد.
- **الحالات:** Loading Skeleton + Empty State.
- **العيوب/النواقص:**
  - لا يوجد Pagination حقيقي (يعرض فقط النص عند total>50).
  - لا يوجد KPI Summary (pipeline value، win rate...).
  - لا يوجد Bulk Actions ولا Export.
  - زر `/admin/quotes/new` غير موجود.

### 2.2 /admin/quotes/[id] (تفاصيل عرض)
- **الملف:** `src/app/admin/(routes)/quotes/[id]/page.tsx`
- **مصادر البيانات:** `GET /api/quotes/:id`, `PATCH /api/quotes/:id/status`, `POST /api/quotes/:id/convert`.
- **الميزات:**
  - عرض بيانات العرض + العميل + التواريخ + المعدات.
  - حالة العرض مع Badge.
  - إجراءات: إرسال، قبول/رفض، تحويل إلى حجز.
  - تحويل مباشر إلى صفحة الحجز.
- **الحالات:** Skeleton Loading + نص إذا العرض غير موجود.
- **العيوب/النواقص:**
  - لا يوجد عرض PDF/Print للعرض.
  - لا يوجد Audit/History لتغييرات الحالة.
  - منطق "تحويل" يعيد التوجيه إلى `/admin/bookings/{id}` (قد يكون id مختلف).

### 2.3 /admin/quotes/new (MISSING)
- **الحالة:** غير منفّذة.
- **مرجع:** زر موجود في `/admin/quotes` و `/admin/dashboard`.

---

### 2.4 /admin/bookings (قائمة الحجوزات)
- **الملف:** `src/app/admin/(routes)/bookings/page.tsx`
- **مصادر البيانات:** `GET /api/bookings` مع search + status.
- **الميزات:**
  - TableFilters للبحث والحالة.
  - جدول يشمل المبالغ، العهدة، التواريخ.
  - رابط تفاصيل الحجز.
- **الحالات:** Skeleton + Empty State + عرض عدد العناصر.
- **العيوب/النواقص:**
  - لا يوجد KPI Summary.
  - لا يوجد Calendar/Timeline view.
  - لا يوجد Bulk Actions أو Export.
  - البحث مؤخر بـ setTimeout بدون debounce حقيقي (قد يؤدي لطلبات زائدة).

### 2.5 /admin/bookings/new (إنشاء حجز)
- **الملف:** `src/app/admin/(routes)/bookings/new/page.tsx`
- **مصادر البيانات:** `GET /api/users`, `GET /api/equipment`, `POST /api/bookings`.
- **الميزات:**
  - اختيار العميل من Select.
  - تحديد تاريخ البداية والنهاية.
  - ملاحظات.
  - اختيار معدات متعددة مع badges وإزالة.
- **الحالات:** Loading أثناء الحفظ + تحذير عند عدم اختيار معدات.
- **العيوب/النواقص:**
  - لا يوجد تحقق من التوافر الفعلي للمعدات بين التواريخ.
  - لا يوجد اختيار الكمية لكل معدة (فقط اختيار/إزالة).
  - لا يوجد حساب تلقائي للتكلفة قبل الحفظ.

### 2.6 /admin/bookings/[id] (تفاصيل الحجز)
- **الملف:** `src/app/admin/(routes)/bookings/[id]/page.tsx`
- **مصادر البيانات:** `GET /api/bookings/:id`, `POST /api/bookings/:id/transition`.
- **الميزات:**
  - State Machine لتغيير حالة الحجز.
  - تبويبات: ملخص، معدات، جدول زمني، دفعات، عقود، توصيل، إرجاع، ملاحظات، سجل.
  - عرض بيانات العميل + التواريخ + المبالغ.
- **الحالات:** Skeleton + رسالة إذا غير موجود.
- **العيوب/النواقص:**
  - تبويبات التوصيل/الإرجاع مجرد نصوص توضيحية وليست بيانات فعلية.
  - سجل التغييرات مجرد نص Placeholder.
  - لا توجد إجراءات مالية (إصدار فاتورة/تحصيل دفعة) من نفس الصفحة.

### 2.7 /admin/calendar (Calendar)
- **الملف:** `src/app/admin/(routes)/calendar/page.tsx`
- **مصادر البيانات:** Mock (`mockBookings`).
- **الميزات:**
  - جدول حجوزات قادمة (وهمي).
  - مربع Placeholder لتقويم.
- **العيوب/النواقص:**
  - لا يوجد ربط بالبيانات الفعلية.
  - لا يوجد Calendar حقيقي (month/week/day).
  - لا يوجد إدارة تعارضات أو سحب وإفلات.

---

## 3) Smart Sales Tools / AI

### 3.1 /admin/ai (AI Features)
- **الملف:** `src/app/admin/(routes)/ai/page.tsx`
- **مصادر البيانات:** `POST /api/ai/*` حسب التبويب.
- **الميزات:**
  - تبويبات: Risk Assessment, Kit Builder, Pricing, Demand Forecast, Chatbot.
  - كل تبويب يحتوي على نموذج إدخال + نتائج.
- **العيوب/النواقص:**
  - لا يوجد سجل استخدام أو KPIs.
  - الإدخال يعتمد على IDs يدوية.
  - لا يوجد حفظ للمخرجات أو ربطها بالحجوزات.

#### Risk Assessment Tab
- **الملف:** `src/app/admin/(routes)/ai/_components/risk-assessment-tab.tsx`
- **الميزات:** إدخال معدات/مدة/قيمة + نتيجة (score, level, recommendation, factors).
- **العيوب:** لا يوجد حفظ أو تصدير أو ربط بالحجز.

#### Kit Builder Tab
- **الملف:** `.../kit-builder-tab.tsx`
- **الميزات:** إدخال نوع المشروع/المدة/الميزانية + توليد Kits مع أسعار.
- **العيوب:** لا يوجد إضافة مباشرة لعرض سعر.

#### Pricing Tab
- **الملف:** `.../pricing-tab.tsx`
- **الميزات:** إدخال سعر حالي + اقتراح تسعير مع Factors.
- **العيوب:** لا يوجد تطبيق مباشر على المنتج.

#### Demand Forecast Tab
- **الملف:** `.../demand-forecast-tab.tsx`
- **الميزات:** توقع الطلب حسب الفترة + توصيات شراء.
- **العيوب:** لا يوجد ربط بالمخزون فعلياً.

#### Chatbot Tab
- **الملف:** `.../chatbot-tab.tsx`
- **الميزات:** محادثة مع AI + ثقة.
- **العيوب:** لا يوجد سياق أعمال (عملاء/حجوزات) فعلي.

### 3.2 /admin/kit-builder (MISSING)
### 3.3 /admin/dynamic-pricing (MISSING)
### 3.4 /admin/ai-recommendations (MISSING)

---

## 4) Inventory & Assets

### 4.1 /admin/inventory (صفحة بوابة المخزون)
- **الملف:** `src/app/admin/(routes)/inventory/page.tsx`
- **الميزات:** بطاقات تنقل إلى المعدات والفئات وإجراء سريع لإضافة معدة.
- **العيوب:** لا يوجد KPIs أو بيانات حقيقية.

### 4.2 /admin/inventory/equipment (قائمة المعدات)
- **الملف:** `src/app/admin/(routes)/inventory/equipment/page.tsx`
- **مصادر البيانات:** `GET /api/equipment`, `GET /api/categories`.
- **الميزات:**
  - فلاتر (بحث، فئة، حالة، نشط/غير نشط).
  - جدول مع صورة/sku/موديل/فئة/علامة/حالة/كمية/سعر.
  - إجراءات: عرض/تعديل/حذف.
- **العيوب:**
  - لا يوجد Bulk Actions.
  - لا يوجد تصدير.
  - لا يوجد KPIs (utilization/availability).

### 4.3 /admin/inventory/equipment/new (إنشاء معدة)
- **الملف:** `src/app/admin/(routes)/inventory/equipment/new/page.tsx`
- **مصادر البيانات:** `GET /api/categories`, `GET /api/brands`, `POST /api/equipment`.
- **الميزات بالتفصيل:**
  - Tabs: معلومات أساسية، ترجمة، SEO، وسائط، مواصفات، ذات الصلة، إعدادات.
  - معلومات أساسية: SKU، موديل، فئة، علامة، حالة، باركود.
  - مخزون: الكمية الإجمالية/المتاحة + موقع المستودع.
  - تسعير: يومي/أسبوعي/شهري.
  - إعدادات: نشط، مميز.
  - ترجمات (ar/en/zh) مع وصف مختصر وطويل.
  - SEO لكل لغة.
  - وسائط: صورة مميزة + معرض + فيديو.
  - مواصفات عبر محرر.
  - معدات ذات صلة.
  - إعدادات إضافية: محتوى الصندوق + buffer time (ساعات/أيام).
- **العيوب/النواقص:**
  - لا يوجد تحقق من أن الكمية المتاحة <= الإجمالية.
  - لا يوجد ربط مباشر بمخزون المستودع الفعلي.
  - لا يوجد دعم خصائص متقدمة (تأمين/وديعة خاصة بالمعدة).

### 4.4 /admin/inventory/equipment/[id] (تفاصيل معدة)
- **الملف:** `src/app/admin/(routes)/inventory/equipment/[id]/page.tsx`
- **مصادر البيانات:** `GET /api/equipment/:id`, `DELETE /api/equipment/:id`.
- **الميزات:**
  - بطاقات معلومات أساسية، تسعير، مخزون.
  - تبويبات: وسائط، ترجمة، مواصفات، معدات ذات صلة، إعدادات، حجوزات.
  - عرض صور وفيديو + ترجمة + مواصفات.
  - جدول حجوزات مرتبطة بالمعدة.
- **العيوب/النواقص:**
  - لا يوجد Audit أو سجل صيانة داخل نفس الصفحة.
  - لا يوجد رابط مباشر لإنشاء صيانة أو تعطيل المعدة.

### 4.5 /admin/inventory/equipment/[id]/edit (تعديل معدة)
- **الملف:** `src/app/admin/(routes)/inventory/equipment/[id]/edit/page.tsx`
- **مصادر البيانات:** `GET /api/equipment/:id`, `GET /api/categories`, `GET /api/brands`, `PATCH /api/equipment/:id`.
- **الميزات:** نفس نموذج الإنشاء + تحميل البيانات الحالية + رفع صور مع equipmentId.
- **العيوب:**
  - لا يوجد مقارنة قبل/بعد أو سجل تغييرات.

### 4.6 /admin/inventory/categories
- **الملف:** `src/app/admin/(routes)/inventory/categories/page.tsx`
- **البيانات:** Mock (`mockCategories`).
- **الميزات:** جدول فئات مع أزرار تعديل/حذف (غير فعالة).
- **العيوب:** لا يوجد CRUD حقيقي ولا hierarchy.

### 4.7 /admin/inventory/brands (MISSING)
- **الحالة:** غير منفّذة.

### 4.8 /admin/inventory/import (استيراد Excel)
- **الملف:** `src/app/admin/(routes)/inventory/import/page.tsx`
- **مصادر البيانات:** `/api/admin/imports/sheets`, `/api/admin/imports/validate`, `/api/admin/imports`.
- **الميزات:**
  - رفع ملف Excel/CSV/TSV.
  - استخراج Sheets + إظهار عدد الصفوف والأعمدة.
  - Mapping لكل Sheet إلى Category/Subcategory.
  - Preview للصفوف + اختيار صفوف محددة.
  - Validation مع أخطاء وتحذيرات.
  - AI Preview + Progress Tracker.
- **العيوب/النواقص:**
  - لا يوجد صفحة History للاستيرادات.
  - لا يوجد Rollback.
  - لا يوجد Template جاهز للتحميل.

### 4.9 /admin/inventory/products/[id]/review (مراجعة AI للمنتج)
- **الملف:** `src/app/admin/(routes)/inventory/products/[id]/review/page.tsx`
- **مصادر البيانات:** `GET /api/admin/products/:id`, `PATCH /api/admin/products/:id`, `POST /api/admin/products/:id/retry-ai`.
- **الميزات:**
  - مراجعة وترجمة en/ar/zh مع SEO.
  - تنبيه إذا حقول ناقصة.
  - Retry AI.
- **العيوب:**
  - لا يوجد قائمة منتجات رئيسية `/admin/inventory/products`.
  - لا يوجد Workflow لربط المنتج بالمخزون الفعلي.

### 4.10 /admin/studios
- **الملف:** `src/app/admin/(routes)/studios/page.tsx`
- **البيانات:** Mock.
- **الميزات:** جدول استوديوهات مع فلتر حالات.
- **العيوب:** لا يوجد CRUD ولا تقويم ولا ربط حجوزات.

---

## 5) Field Operations

### 5.1 /admin/ops/warehouse
- **الملف:** `src/app/admin/(routes)/ops/warehouse/page.tsx`
- **مصادر البيانات:** `/api/warehouse/queue/check-out`, `/api/warehouse/queue/check-in`.
- **الميزات:**
  - KPIs: عدد جاهز للإخراج وعدد جاهز للإرجاع.
  - روابط سريعة: Check-out / Check-in / Inventory.
  - قوائم الحجز الجاهزة.
- **العيوب:**
  - الصفحات الفرعية (check-out, check-in, inventory) مفقودة.
  - لا يوجد SLA أو مؤشر زمن الانتظار.
  - لا يوجد Barcode Scan أو Pick List.

### 5.2 /admin/ops/delivery
- **الملف:** `src/app/admin/(routes)/ops/delivery/page.tsx`
- **مصادر البيانات:** `/api/delivery/pending`, `/api/delivery/:id/status`.
- **الميزات:**
  - قائمة توصيلات مع فلتر الحالة.
  - تغيير الحالة مباشرة.
  - عرض تفاصيل العنوان/السائق.
- **العيوب:**
  - لا يوجد تخطيط مسار أو خريطة.
  - صفحة schedule مفقودة.
  - لا يوجد إثبات تسليم (POD).

### 5.3 /admin/technicians
- **الملف:** `src/app/admin/(routes)/technicians/page.tsx`
- **البيانات:** Mock.
- **الميزات:** جدول فنيين + فلتر حالة.
- **العيوب:** لا يوجد CRUD ولا جدول عمل فعلي.

### 5.4 /admin/maintenance
- **الملف:** `src/app/admin/(routes)/maintenance/page.tsx`
- **مصادر البيانات:** `/api/maintenance`.
- **الميزات:**
  - فلاتر حسب الحالة والنوع والأولوية.
  - جدول طلبات الصيانة مع الفني.
- **العيوب:**
  - لا يوجد KPIs (overdue/MTTR).
  - روابط /admin/maintenance/new و /admin/maintenance/[id] غير موجودة.

---

## 6) Finance & Legal

### 6.1 /admin/invoices
- **الملف:** `src/app/admin/(routes)/invoices/page.tsx`
- **مصادر البيانات:** `/api/invoices`.
- **الميزات:**
  - فلاتر حالة/نوع.
  - جدول بالمبالغ والمدفوع والمتبقي.
- **العيوب:**
  - الروابط إلى /admin/invoices/new و /admin/invoices/[id] مفقودة.
  - لا يوجد Aging Report.

### 6.2 /admin/payments
- **الملف:** `src/app/admin/(routes)/payments/page.tsx`
- **مصادر البيانات:** `/api/payments`.
- **الميزات:**
  - فلتر حالة + جدول معاملات + رابط تفاصيل.
- **العيوب:**
  - صفحة تفاصيل المدفوعات مفقودة.
  - لا يوجد إجراءات رد/تحصيل من الواجهة.

### 6.3 /admin/contracts
- **الملف:** `src/app/admin/(routes)/contracts/page.tsx`
- **مصادر البيانات:** `/api/contracts`.
- **الميزات:**
  - فلتر حالة + جدول + حالة توقيع.
- **العيوب:**
  - /admin/contracts/[id] غير موجود.

### 6.4 /admin/finance
- **الملف:** `src/app/admin/(routes)/finance/page.tsx`
- **البيانات:** Mock.
- **الميزات:** تبويبات فواتير/مدفوعات (تجريبي).
- **العيوب:** لا يوجد ربط حقيقي ولا إجراءات.

### 6.5 /admin/finance/reports
- **الملف:** `src/app/admin/(routes)/finance/reports/page.tsx`
- **مصادر البيانات:** `/api/reports/*`.
- **الميزات:**
  - اختيار نوع تقرير + نطاق تاريخ.
  - KPIs للإيرادات.
  - عرض JSON خام.
- **العيوب:**
  - لا يوجد رسوم بيانية حقيقية لمعظم الأنواع.
  - تصدير التقرير Placeholder.

---

## 7) CRM & Marketing

### 7.1 /admin/clients
- **الملف:** `src/app/admin/(routes)/clients/page.tsx`
- **مصادر البيانات:** `/api/clients`.
- **الميزات:**
  - بحث + فلتر حالة.
  - جدول بعدد الحجوزات وإجمالي الإنفاق.
- **العيوب:**
  - صفحات create/detail مفقودة.
  - لا يوجد تاريخ تواصل أو ملاحظات.

### 7.2 /admin/coupons
- **الملف:** `src/app/admin/(routes)/coupons/page.tsx`
- **مصادر البيانات:** `/api/coupons`.
- **الميزات:**
  - بحث + فلتر حالة/نوع.
  - جدول استخدام وتاريخ انتهاء.
- **العيوب:**
  - create/detail مفقودة.
  - لا يوجد تحليلات أداء الكوبونات.

### 7.3 /admin/marketing
- **الملف:** `src/app/admin/(routes)/marketing/page.tsx`
- **مصادر البيانات:** `/api/marketing/campaigns`.
- **الميزات:**
  - فلتر حالة/نوع + جدول حملات.
- **العيوب:**
  - صفحات إنشاء/تفاصيل الحملات مفقودة.
  - لا يوجد تقارير Open/Click/Conversion.

---

## 8) Settings

### 8.1 /admin/settings
- **الملف:** `src/app/admin/(routes)/settings/page.tsx`
- **الميزات:** بطاقات تنقل للإعدادات.
- **العيوب:** لا يوجد إعدادات عامة.

### 8.2 /admin/settings/integrations
- **الملف:** `src/app/admin/(routes)/settings/integrations/page.tsx`
- **مصادر البيانات:** `/api/integrations` + `/api/integrations/:type` + `/api/integrations/:type/test`.
- **الميزات التفصيلية:**
  - تبويب Payments (Tap): مفاتيح Secret/Public + اختبار اتصال.
  - تبويب Email: SMTP Host/User/Pass/Port + اختبار.
  - تبويب WhatsApp: API Key + اختبار.
  - تبويب Analytics: GTM/GA4/Meta Pixel + اختبار.
  - تبويب Webhooks: عرض endpoint + اختبار.
- **العيوب:**
  - لا يوجد Log للويبهوك أو فحص أحداث.
  - لا يوجد بيئة dev/staging/prod.

### 8.3 /admin/settings/features
- **الملف:** `src/app/admin/(routes)/settings/features/page.tsx`
- **الميزات:** Feature Flags مع بحث + Audit Trail + Approval.
- **العيوب:**
  - لا يوجد استهداف تدريجي (percentage rollout).
  - لا يوجد scheduled enable/disable.

### 8.4 /admin/settings/roles
- **الملف:** `src/app/admin/(routes)/settings/roles/page.tsx`
- **البيانات:** Mock.
- **الميزات:** جدول أدوار ثابت.
- **العيوب:** CRUD غير موجود.

### 8.5 /admin/settings/roles/[id]
- **الملف:** `src/app/admin/(routes)/settings/roles/[id]/page.tsx`
- **البيانات:** Mock.
- **الميزات:** نموذج معلومات الدور + permissions ثابتة.
- **العيوب:** لا يوجد حفظ فعلي.

### 8.6 /admin/settings/ai-control
- **الملف:** `src/app/admin/(routes)/settings/ai-control/page.tsx`
- **مصادر البيانات:** `/api/admin/settings/ai`, `/api/admin/ai/analytics`.
- **الميزات:**
  - إعدادات مزود AI (openai/gemini).
  - KPIs: Jobs/Success/Cost.
  - Placeholder لسجل الوظائف.
- **العيوب:**
  - لا يوجد سجل فعلي للـ jobs.
  - لا يوجد Alerts للميزانية.

---

## 9) صفحات إضافية خارج الـ Sidebar (لكن موجودة في /admin)

### /admin/users
- **الملف:** `src/app/admin/(routes)/users/page.tsx`
- **البيانات:** Mock (`mockUsers`).
- **الميزات:** جدول مستخدمين.
- **العيوب:** CRUD غير موجود.

### /admin/orders
- **الملف:** `src/app/admin/(routes)/orders/page.tsx`
- **مصادر البيانات:** `/api/orders` مع pagination.
- **الميزات:** جدول طلبات + بحث + فلتر حالة.
- **العيوب:** صفحات create/detail مفقودة.

### /admin/wallet
- **الملف:** `src/app/admin/(routes)/wallet/page.tsx`
- **البيانات:** Mock.
- **الميزات:** جدول معاملات رصيد.
- **العيوب:** CRUD وإدارة فعلية غير موجودة.

### /admin/super
- **الملف:** `src/app/admin/(routes)/super/page.tsx`
- **مصادر البيانات:** `/api/admin/health`, `/api/admin/read-only`, `/api/admin/jobs/rerun`, `/api/admin/locks/release`, `/api/admin/bookings/force-transition`.
- **الميزات:**
  - Health checks.
  - Toggle Read-only.
  - Rerun Job.
  - Release Lock.
  - Force State Transition للحجوزات.
- **العيوب:**
  - لا يوجد سجل العمليات (Audit Log).
  - لا يوجد حماية إضافية (تأكيد مزدوج أو MFA).

---

## 10) روابط مذكورة في UI لكنها غير موجودة
- /admin/quotes/new
- /admin/invoices/new
- /admin/invoices/[id]
- /admin/payments/[id]
- /admin/contracts/[id]
- /admin/clients/new
- /admin/clients/[id]
- /admin/coupons/new
- /admin/coupons/[id]
- /admin/marketing/campaigns/new
- /admin/marketing/campaigns/[id]
- /admin/maintenance/new
- /admin/maintenance/[id]
- /admin/ops/warehouse/check-out
- /admin/ops/warehouse/check-in
- /admin/ops/warehouse/inventory
- /admin/ops/delivery/schedule
- /admin/inventory/products
- /admin/orders/new
- /admin/orders/[id]
- /admin/wallet/[id]
- /admin/notifications
- /admin/profile
- /admin/inventory/brands
- /admin/action-center
- /admin/approvals
- /admin/live-ops
- /admin/kit-builder
- /admin/dynamic-pricing
- /admin/ai-recommendations

---

## 11) ملخص العيوب العامة المشتركة
- نقص KPIs موحّد في معظم صفحات القوائم.
- نقص Export/CSV وBulk Actions.
- نقص سجلات Audit وتتبّع التغييرات.
- وجود صفحات كثيرة Mock/Placeholder.
- روابط كثيرة تقود لصفحات غير موجودة.

---

> هذا التقرير يغطي كل صفحة موجودة أو مذكورة داخل لوحة التحكم حسب الكود الحالي، مع توضيح الميزات والعيوب ومصادر البيانات.
