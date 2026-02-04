# إدارة الملفات – الموقع العام (Public Website)

> **الغرض:** توثيق هيكل المجلدات والملفات للموقع العام فقط. لا يشمل لوحة التحكم (Admin) أو الـ API.
> **مرجع:** CURSOR_BUILD_SPEC_PUBLIC_WEBSITE.md، PUBLIC_WEBSITE_COMPLETE_SPECIFICATION.md

---

## 1) المبادئ

- **الموقع العام** له مسارات ومكونات وطبقة API client خاصة به.
- **لا تعديل** على `src/app/admin/` أو مكونات الـ admin.
- **لا تعديل** على منطق الـ API الموجودة؛ يُسمح بإضافة routes عامة (مثلاً `api/public/`) للقراءة بدون auth.
- أسماء الملفات: **kebab-case**. أسماء المكونات: **PascalCase**.
- المكونات الخاصة بالموقع العام توضع تحت `components/` في مجلدات واضحة (مثلاً `public/` أو `features/` حسب الميزة).

---

## 2) هيكل المسارات (App Router) – الموقع العام

الجدول التالي يحدد **أين** كل صفحة وما إذا كانت موجودة أو مطلوبة.

| المسار | الملف | الحالة | ملاحظة |
|--------|--------|--------|--------|
| **Marketing** | | | |
| `/` | `app/(public)/page.tsx` | مطلوب | الصفحة الرئيسية |
| `/how-it-works` | `app/(public)/how-it-works/page.tsx` | مطلوب | كيف نعمل |
| `/pricing` | `app/(public)/pricing/page.tsx` | اختياري | أو قسم في الرئيسية |
| `/policies` | `app/(public)/policies/page.tsx` | مطلوب | إرجاع، أضرار، رسوم |
| `/contact` أو `/support` | `app/(public)/support/page.tsx` | مطلوب | دعم + تتبع حجز |
| **Equipment** | | | |
| `/equipment` | `app/(public)/equipment/page.tsx` | مطلوب | كتالوج المعدات |
| `/equipment/[category]` | `app/(public)/equipment/[category]/page.tsx` | مطلوب | تصفية حسب الفئة |
| `/equipment/[slug]` | `app/(public)/equipment/[slug]/page.tsx` | مطلوب | تفاصيل معدة |
| **Studio** | | | |
| `/studios` | `app/(public)/studios/page.tsx` | مطلوب | قائمة الاستوديوهات |
| `/studio/[slug]` | `app/(public)/studio/[slug]/page.tsx` | مطلوب | تفاصيل استوديو |
| `/studio/[slug]/book` | `app/(public)/studio/[slug]/book/page.tsx` | مطلوب | حجز استوديو |
| **Packages / Kits** | | | |
| `/packages` | `app/(public)/packages/page.tsx` | مطلوب | قائمة الباقات |
| `/packages/[slug]` | `app/(public)/packages/[slug]/page.tsx` | مطلوب | تفاصيل باقة |
| `/build-your-kit` | `app/(public)/build-your-kit/page.tsx` | مطلوب | معالج ابنِ كيتك |
| **Purchase** | | | |
| `/cart` | `app/(public)/cart/page.tsx` | مطلوب | السلة |
| `/checkout` | `app/(public)/checkout/page.tsx` | مطلوب | إتمام الطلب |
| `/payment/redirect` | `app/(public)/payment/redirect/page.tsx` | مطلوب | بعد التوجيه من بوابة الدفع |
| `/payment/processing` | `app/(public)/payment/processing/page.tsx` | مطلوب | معالجة الدفع (تأخر callback) |
| `/booking/confirmation/[id]` | `app/(public)/booking/confirmation/[id]/page.tsx` | مطلوب | تأكيد الحجز |
| **Account (Auth)** | | | |
| `/register` | `app/(auth)/register/page.tsx` | اختياري | التدفق الأساسي مؤجّل عند الـ checkout |
| `/verify-email` | `app/(auth)/verify-email/page.tsx` | مطلوب | تحقق الإيميل (token) |
| `/login` | `app/(auth)/login/page.tsx` | موجود | لا نقلل |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | موجود | لا نقلل |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | مطلوب | إعادة تعيين كلمة المرور |
| **Client Portal** | | | |
| `/me/bookings` | `app/me/bookings/page.tsx` | مطلوب | قائمة حجوزاتي (أو ربط مع portal) |
| `/me/bookings/[id]` | `app/me/bookings/[id]/page.tsx` | مطلوب | تفاصيل حجز + طلب تغيير/تمديد/إلغاء |

**ملاحظات:**
- استخدام **Route Group** `(public)` لصفحات الموقع العام مع **layout** واحد (هيدر + فوتر).
- المسارات `(auth)` تبقى كما هي؛ إضافة `register`, `verify-email`, `reset-password` إن لم توجد.
- **البورتال:** المواصفات تذكر `/me/bookings`. المشروع الحالي فيه `portal/bookings`. يمكن توحيد تحت `/me` مع redirect من `/portal` أو الإبقاء على `/portal` وتحديث المواصفات لاحقاً.

---

## 3) Layouts المطلوبة

| الملف | الغرض |
|-------|--------|
| `app/layout.tsx` | موجود – لا تعديل جذري (قد نضيف locale provider لاحقاً). |
| `app/(public)/layout.tsx` | **مطلوب** – هيدر الموقع العام + فوتر + محتوى. يلف كل صفحات (public). |
| `app/(auth)/layout.tsx` | اختياري – إن وُجد للـ auth يبقى. |
| `app/me/layout.tsx` | **مطلوب** – layout البورتال (قائمة جانبية أو تبويبات: حجوزات، مستندات). |

---

## 4) مكونات الواجهة (Components) – الموقع العام

هيكل مقترح تحت `src/components/` دون المساس بمجلدات الـ admin.

### 4.1 Layouts (الموقع العام)

| الملف | الغرض |
|-------|--------|
| `components/public/public-header.tsx` | هيدر: شعار، تنقل، مبدل لغة (AR \| EN \| 中文)، mini-cart، دخول/حسابي |
| `components/public/public-footer.tsx` | فوتر: روابط (عن، اتصل، سياسات)، سوشال، حقوق النشر |
| `components/public/public-nav.tsx` | قائمة تنقل رئيسية (للهيدر) |
| `components/public/language-switcher.tsx` | مبدل اللغة |
| `components/public/mini-cart.tsx` | أيقونة/زر السلة مع العدد (يربط إلى /cart) |

### 4.2 Equipment

| الملف | الغرض |
|-------|--------|
| `components/features/equipment/equipment-grid.tsx` | شبكة بطاقات معدات |
| `components/features/equipment/equipment-card.tsx` | بطاقة معدة (صورة، اسم، سعر، توفر، زر) |
| `components/features/equipment/equipment-filters.tsx` | فلاتر (فئة، ماركة، سعر، توفر) – سايدبار ديسكتوب / درج موبايل |
| `components/features/equipment/equipment-detail-hero.tsx` | قسم الهيرو في صفحة التفاصيل |
| `components/features/equipment/equipment-gallery.tsx` | معرض صور المعدة |
| `components/features/equipment/equipment-price-block.tsx` | كتلة السعر + انتقاء التاريخ + زر أضف للحجز |
| `components/features/equipment/availability-badge.tsx` | شارة توفر (متاح / غير متاح / محدود) |
| `components/features/equipment/recommended-equipment.tsx` | قسم "يكمل معه" / توصيات |

### 4.3 Studio

| الملف | الغرض |
|-------|--------|
| `components/features/studio/studio-grid.tsx` | شبكة استوديوهات |
| `components/features/studio/studio-card.tsx` | بطاقة استوديو |
| `components/features/studio/studio-detail-hero.tsx` | هيرو تفاصيل الاستوديو |
| `components/features/studio/studio-booking-form.tsx` | نموذج حجز (تاريخ، وقت، مدة، إضافات) |
| `components/features/studio/studio-slot-picker.tsx` | انتقاء شريط زمني (ساعة/نصف يوم/يوم) |

### 4.4 Packages & Build Your Kit

| الملف | الغرض |
|-------|--------|
| `components/features/packages/package-grid.tsx` | شبكة باقات |
| `components/features/packages/package-card.tsx` | بطاقة باقة |
| `components/features/packages/package-detail.tsx` | تفاصيل باقة + توفر |
| `components/features/build-your-kit/kit-wizard.tsx` | معالج الخطوات |
| `components/features/build-your-kit/kit-step-*.tsx` | مكونات خطوات (استخدام، كاميرا، عدسة، إلخ) |

### 4.5 Cart & Checkout

| الملف | الغرض |
|-------|--------|
| `components/features/cart/cart-list.tsx` | قائمة عناصر السلة |
| `components/features/cart/cart-item.tsx` | صف عنصر (معدة/استوديو/باقة) مع كمية وحذف |
| `components/features/cart/cart-summary.tsx` | ملخص (مجموع، خصم، ضريبة، إجمالي) |
| `components/features/checkout/checkout-form.tsx` | نموذج إتمام الطلب (جهة اتصال، شروط) |
| `components/features/checkout/price-breakdown.tsx` | تفصيل السعر (قابل للتوسيع) |
| `components/features/checkout/price-lock-notice.tsx` | إشعار قفل السعر (TTL) |
| `components/features/checkout/coupon-field.tsx` | حقل كود الخصم |

### 4.6 Payment & Confirmation

| الملف | الغرض |
|-------|--------|
| `components/features/payment/payment-redirect.tsx` | صفحة التوجيه (انتظار) |
| `components/features/payment/payment-processing.tsx` | معالجة الدفع (استعلام دوري + منع دفع مزدوج) |
| `components/features/booking/booking-confirmation-view.tsx` | عرض تأكيد الحجز (ملخص، خطوات تالية، واتساب) |

### 4.7 Client Portal (/me)

| الملف | الغرض |
|-------|--------|
| `components/features/portal/booking-list.tsx` | قائمة حجوزاتي |
| `components/features/portal/booking-card.tsx` | بطاقة حجز في القائمة |
| `components/features/portal/booking-detail-view.tsx` | عرض تفاصيل حجز |
| `components/features/portal/booking-actions.tsx` | أزرار طلب تغيير / تمديد / إلغاء |
| `components/features/portal/request-change-form.tsx` | نموذج طلب تغيير |
| `components/features/portal/request-extension-form.tsx` | نموذج طلب تمديد |

### 4.8 Support & Shared

| الملف | الغرض |
|-------|--------|
| `components/features/support/support-page.tsx` | تجميع: FAQ، تتبع حجز، نموذج تذكرة |
| `components/features/support/booking-tracker.tsx` | إدخال رقم حجز + هاتف/إيميل |
| `components/features/support/whatsapp-cta.tsx` | زر واتساب مع رسالة مسبقة (سياق الصفحة + حجز إن وُجد) |
| `components/shared/price-display.tsx` | عرض سعر (مع عملة وتنسيق) |
| `components/shared/empty-state.tsx` | موجود – إعادة استخدام |
| `components/shared/error-state.tsx` | موجود – إعادة استخدام |
| `components/states/loading-state.tsx` | موجود – إعادة استخدام |

استخدام مكونات **ui/** (Button, Card, Input, Skeleton, Dialog, Tabs, إلخ) كما هي.

---

## 5) Lib – API Client و Hooks و i18n

| المسار | الغرض |
|--------|--------|
| `lib/api/public/` | طبقة استدعاء الـ API للقراءة العامة (بدون auth) |
| `lib/api/public/equipment.ts` | GET equipment, GET equipment by id/slug |
| `lib/api/public/categories.ts` | GET categories |
| `lib/api/public/brands.ts` | GET brands (للفلتر) |
| `lib/api/public/studios.ts` | GET studios, GET studio by slug |
| `lib/api/public/availability.ts` | POST availability (equipment / studio) |
| `lib/api/public/packages.ts` | GET packages, GET package by slug |
| `lib/api/client.ts` أو `lib/api/base.ts` | دالة fetch أساسية (base URL، headers) – إن لم توجد |
| `lib/hooks/use-equipment-list.ts` | TanStack Query لقتائمة المعدات |
| `lib/hooks/use-equipment.ts` | TanStack Query لمعدة واحدة |
| `lib/hooks/use-categories.ts` | قائمة الفئات |
| `lib/hooks/use-studios.ts` | قائمة الاستوديوهات |
| `lib/hooks/use-cart.ts` | السلة (مع revalidation) |
| `lib/hooks/use-checkout.ts` | قفل سعر + إنشاء جلسة دفع |
| `lib/i18n/` | ترجمات واجهة الموقع (ar, en, zh) – مفاتيح مشتركة |
| `lib/i18n/locales/ar.json` | نصوص عربية |
| `lib/i18n/locales/en.json` | نصوص إنجليزية |
| `lib/i18n/locales/zh.json` | نصوص صينية |
| `lib/i18n/config.ts` | locales مدعومة، افتراضي، اتجاه RTL/LTR |

**ملاحظة:** إن وُجدت بالفعل hooks أو API في `lib/` للـ admin، لا نستبدلها؛ نضيف فقط ما يخص الموقع العام (مثلاً تحت `lib/api/public/` و hooks جديدة أو نسخ للاستخدام العام).

---

## 6) API Routes عامة (قراءة بدون auth)

الموجود حالياً: غالباً `GET /api/equipment` و `GET /api/categories` تتطلب auth. لقراءة الكتالوج من الموقع العام بدون تسجيل دخول:

| المسار | الغرض |
|--------|--------|
| `app/api/public/equipment/route.ts` | GET قائمة معدات (isActive فقط)، نفس الفلاتر |
| `app/api/public/categories/route.ts` | GET فئات (للفلتر والتنقل) |
| `app/api/public/brands/route.ts` | GET ماركات (للفلتر) |
| `app/api/public/studios/route.ts` | GET استوديوهات (أو اعتماد على studios الحالي إن أصبح عاماً) |
| `app/api/public/equipment/[id]/route.ts` أو `[slug]` | GET معدة واحدة للعرض العام |

بقية الـ API (cart, checkout, payment, bookings, auth) تبقى كما هي أو تُستدعى من الواجهة بعد تسجيل الدخول/التسجيل المؤجّل.

---

## 7) الخلاصة

- **app:** Route group `(public)` لجميع صفحات الموقع العام + layouts (public, me) + auth كما هو مع إضافة register/verify-email/reset-password إن لزم.
- **components:** مجلد `public/` للهيدر والفوتر؛ باقي المكونات تحت `features/` حسب الميزة (equipment, studio, packages, build-your-kit, cart, checkout, payment, booking, portal, support) + استخدام `shared/` و `states/` و `ui/`.
- **lib:** `api/public/` لاستدعاءات القراءة العامة، و`hooks/` للبيانات، و`i18n/` للغات الثلاث.
- **api:** إضافة `api/public/` للكتالوج والتوفر بدون auth دون تغيير سلوك الـ API الحالية للـ admin.

لا يبدأ تنفيذ الكود حتى يُطلب؛ هذا المستند للمرجع وتنظيم الملفات فقط.
