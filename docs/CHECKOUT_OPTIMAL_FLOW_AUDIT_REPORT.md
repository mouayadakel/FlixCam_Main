# تقرير تدقيق نهائي: تدفق التشيك أوت الأمثل (Optimal Checkout Flow)

**التاريخ:** 2026-02-26  
**الحالة:** مُتحقق منه مقابل الكود الفعلي

---

## أ) الملخص التنفيذي النهائي

| الميزة | الحالة النهائية | الدليل المُتحقق منه (ملف:سطر) | ملاحظات |
|--------|-----------------|------------------------------|---------|
| خطوات التشيك أوت (Cart → Receiver → Addons → Review → Confirmation) | PARTIAL | `cart/page.tsx:106-119` | الخطوات 1–3 في نفس الصفحة؛ التأكيد في `/booking/confirmation/[id]` |
| مؤشر التقدم (Stepper) لاصق على الموبايل | MISSING | `stepper.tsx:1-113` موجود، `cart/page.tsx` لا يستورده | Stepper غير مستخدم في صفحة السلة |
| خيارات المستلم (أنا / من القائمة / شخص آخر) | DONE | `seed-checkout-form.ts:62-136`, `checkout-step-receiver.tsx:27-45,48-68` | receiver_type + SavedReceiverSelector |
| التحقق: اسم ≥ 2 حرف | MISSING | `receiver.validator.ts:8` | `min(1)` فقط |
| التحقق: هاتف سعودي 05xxxxxxxx | MISSING | `receiver.validator.ts:10` | `min(1)` فقط، لا regex |
| رسائل خطأ inline فورية | MISSING | `checkout-step-receiver.tsx:76-106` | handleContinue يستدعي onSuccess() مباشرة دون تحقق |
| خيار "حفظ هذا المستلم" | PARTIAL | `seed-checkout-form.ts:126-136`, `create-session/route.ts` (كامل) | الحقل موجود؛ create-session لا ينشئ Receiver |
| صورة الهوية إلزامية | PARTIAL | `seed-checkout-form.ts:113-123` conditionValue: someone_else | عند "أنا" غير مطلوبة |
| أنواع jpg/png وحجم < 10MB | PARTIAL | `upload-document/route.ts:11-13` | MAX_SIZE=5MB، ALLOWED تشمل webp |
| معاينة + تقدم + زر تغيير | PARTIAL | `field-renderers/index.tsx:261-279` | نص "Uploaded" فقط |
| طريقة الاستلام + خريطة | DONE | `seed-checkout-form.ts`, `GoogleMapPicker` في MapField | |
| التحقق من الخادم قبل الخطوة 2 | MISSING | `checkout-step-receiver.tsx:76-106` | لا تحقق |
| صفحة /portal/receivers | MISSING | لا يوجد في `src/app/portal/` | |
| الخطوة 2: فني (1–8 ساعات)، تأمين، إكسسوارات | PARTIAL | `checkout-step-addons.tsx:31-36` | Checkbox فني فقط |
| زر رجوع | MISSING | `cart/page.tsx` | لا يوجد |
| ملخص + كود خصم + VAT 15% | DONE | `checkout-step-review-pay.tsx:93,109-227` | POST /api/cart/coupon |
| Price Lock | PARTIAL | `lock-price/route.ts:12` LOCK_TTL=120، `price-lock-notice.tsx:11` LOCK_TTL=900 | خادم 2 ساعة، واجهة 15 دقيقة |
| زر "إتمام الحجز – X ريال" | DONE | `inline-tap-payment.tsx:118-119` | |
| صفحة التأكيد + PDF | DONE | `confirmation/[id]/page.tsx:164-229` | |
| زر "طلباتي" | PARTIAL | `confirmation/[id]/page.tsx:250` | `href="/portal/bookings"` وليس /portal/orders |
| تفريغ السلة/التشيك أوت بعد النجاح | PARTIAL | `inline-tap-payment.tsx:87-88` | window.location.href دون استدعاء clearCheckout |
| صور الهوية خاصة + signed URL | MISSING | `upload-document/route.ts:13,50` | `public/uploads/checkout` |
| CSRF | MISSING | - | |
| POST /api/checkout/apply-promo | PARTIAL | - | الواجهة تستخدم `/api/cart/coupon` |
| POST /api/orders | MISSING | - | يُستخدم create-session |
| POST /api/payments/process | MISSING | - | TAP داخل create-session |

---

## ب) التصحيحات والاختلافات عن المسودة

| البند | المسودة | التصحيح | السبب |
|-------|---------|---------|-------|
| receiver.validator.ts | min(1) للاسم | مُؤكد | السطر 8: `z.string().min(1, 'Name required')` |
| receiver.validator.ts | لا regex للهاتف | مُؤكد | السطر 10: `z.string().min(1, 'Phone required')` فقط |
| Stepper | غير مستخدم | مُؤكد | `cart/page.tsx` لا يستورد Stepper (سطور 13-19) |
| handleContinue | لا تحقق | مُؤكد | `checkout-step-receiver.tsx:76-106` يستدعي onSuccess() مباشرة |
| upload-document | 5MB, public | مُؤكد | سطور 11-13، 50 |
| lock-price TTL | 120 vs 15 | مُؤكد | `lock-price/route.ts:12` = 120، `price-lock-notice.tsx:11` = 900 ثانية |
| زر "طلباتي" | /portal/bookings | مُؤكد | `confirmation/[id]/page.tsx:250` |
| /portal/receivers | غير موجود | مُؤكد | لا توجد صفحة في portal |
| apply-promo | /api/cart/coupon | مُؤكد | `checkout-step-review-pay.tsx:93` |
| receiver_save_for_later | لا يُنفَّذ | مُؤكد | create-session لا يذكر Receiver أو receiver_save_for_later |
| cart.store | لا clearCart | مُؤكد | cart.store لا يحتوي على clearCart |
| clearCheckout | موجود لكن غير مستدعى | مُؤكد | checkout.store:101-112؛ لا استدعاء في التدفق |

---

## ج) خطة التنفيذ P0 / P1 / P2

### P0 (معطّل)

**1. التحقق قبل الانتقال من الخطوة 1**
- **الهدف:** منع الانتقال ببيانات ناقصة أو غير صحيحة.
- **الملفات:** `src/components/features/checkout/checkout-step-receiver.tsx`
- **التعديل:** إضافة دالة `validateStep1()` قبل استدعاء `onSuccess()` في `handleContinue` (سطر 105). التحقق من: اسم (حسب receiver_type)، هاتف، صورة عند someone_else، عنوان + lat/lng عند delivery.
- **معايير القبول:** عدم الانتقال للخطوة 2 عند وجود حقول فارغة أو غير صحيحة؛ عرض رسائل خطأ inline.
- **ملاحظة مخاطر:** التأكد من عدم كسر التدفق عند receiver_type=myself.

**2. صورة الهوية إلزامية عند "أنا"**
- **الهدف:** تطبيق المواصفة (صورة الهوية مطلوبة دائماً).
- **الملفات:** `prisma/seed-checkout-form.ts` أو منطق عرض الحقول في `DynamicFormRenderer` / `checkout-form`.
- **التعديل:** إزالة `conditionFieldKey`/`conditionValue` عن حقل `receiver_id_photo` أو جعله مطلوباً عند myself أيضاً.
- **معايير القبول:** ظهور حقل صورة الهوية وإلزامه عند "أنا" و"شخص آخر".
- **ملاحظة مخاطر:** قد يتطلب تحديث seed أو migration للـ CheckoutFormField.

**3. تنفيذ حفظ المستلم**
- **الهدف:** عند تفعيل "حفظ هذا المستلم" إنشاء سجل في Receiver.
- **الملفات:** `src/app/api/checkout/create-session/route.ts`
- **التعديل:** بعد إنشاء الـ booking (سطر 119)، إذا `body.checkoutFormData?.receiver_save_for_later === true` و`body.receiver`، استدعاء `prisma.receiver.create` بالبيانات المناسبة.
- **معايير القبول:** ظهور المستلم في GET /api/receivers بعد إتمام الطلب مع تفعيل الحفظ.
- **ملاحظة مخاطر:** التحقق من عدم التكرار (مثلاً بالتحقق من وجود مستلم بنفس الاسم/الهاتف).

---

### P1

**4. استخدام Stepper في صفحة السلة**
- **الهدف:** عرض مؤشر تقدم واضح ولاصق على الموبايل.
- **الملفات:** `src/app/(public)/cart/page.tsx`
- **التعديل:** استيراد `Stepper` من `@/components/ui/stepper`، إضافة `<Stepper steps={[...]} currentStep={step - 1} />` فوق محتوى الخطوات (قبل سطر 109)، مع `sticky top-0` على الموبايل.
- **معايير القبول:** ظهور Stepper فوق الخطوات، لاصق على الموبايل.
- **ملاحظة مخاطر:** التأكد من توافق الـ step مع القيم 1/2/3.

**5. التحقق من الاسم والهاتف في receiver.validator**
- **الهدف:** اسم ≥ 2 حرف، هاتف بصيغة سعودية.
- **الملفات:** `src/lib/validators/receiver.validator.ts`
- **التعديل:** `name: z.string().min(2, '...')`، `phone: z.string().regex(/^(05|9665)\d{8}$/, '...')`.
- **معايير القبول:** رفض القيم غير الصحيحة في API receivers.
- **ملاحظة مخاطر:** التأكد من استخدام الـ validator في create-session أو في واجهة الخطوة 1.

**6. رسائل خطأ inline فورية**
- **الهدف:** عرض أخطاء التحقق تحت كل حقل.
- **الملفات:** `src/components/features/checkout/checkout-step-receiver.tsx`, `DynamicFormRenderer` أو `field-renderers`
- **التعديل:** تخزين `errors: Record<string, string>` في state، تعبئتها من `validateStep1()`، عرضها بجانب الحقول.
- **معايير القبول:** ظهور رسالة خطأ تحت الحقل عند الخطأ.
- **ملاحظة مخاطر:** لا.

**7. رفع صورة الهوية: حد 10MB، معاينة، زر تغيير**
- **الهدف:** توافق مع المواصفة وتحسين UX.
- **الملفات:** `src/app/api/checkout/upload-document/route.ts`, `src/components/features/checkout/field-renderers/index.tsx` (FileField)
- **التعديل:** (أ) رفع MAX_SIZE إلى 10MB. (ب) في FileField: عرض `<img src={value} />` عند وجود value، زر "تغيير" لإعادة الرفع.
- **معايير القبول:** قبول ملفات حتى 10MB، معاينة الصورة، إمكانية التغيير.
- **ملاحظة مخاطر:** التحقق من حدود الرفع في الخادم (body size).

**8. التحقق من الخادم قبل الخطوة 2**
- **الهدف:** تحقق مزدوج (client + server).
- **الملفات:** `src/app/api/checkout/validate-step1/route.ts` (جديد)، `checkout-step-receiver.tsx`
- **التعديل:** إنشاء POST /api/checkout/validate-step1 يستقبل formValues ويرجع { valid: boolean, errors: {...} }. استدعاؤه من handleContinue قبل onSuccess.
- **معايير القبول:** عدم الانتقال عند فشل التحقق من الخادم.
- **ملاحظة مخاطر:** لا.

**9. تخزين صور الهوية بشكل خاص**
- **الهدف:** عدم تعريض صور الهوية عبر URL عامة.
- **الملفات:** `src/app/api/checkout/upload-document/route.ts`, مجلد تخزين خارج `public/`
- **التعديل:** حفظ الملفات في `storage/uploads/checkout/` (خارج public)، إنشاء GET /api/checkout/signed-url?id=... يعيد signed URL صالحة 24 ساعة.
- **معايير القبول:** عدم إمكانية الوصول المباشر لصور الهوية؛ الوصول عبر signed URL فقط.
- **ملاحظة مخاطر:** يتطلب تغيير كيفية استخدام الـ URL في النماذج والـ booking.

---

### P2

**10. صفحة /portal/receivers**
- **الهدف:** إدارة المستلمين المحفوظين (CRUD + افتراضي).
- **الملفات:** `src/app/portal/receivers/page.tsx` (جديد)، إضافة رابط في القائمة الجانبية للـ portal.
- **التعديل:** صفحة تعرض قائمة من GET /api/receivers، أزرار إضافة/تعديل/حذف، خيار "تعيين كافتراضي".
- **معايير القبول:** إمكانية إضافة مستلم، تعديله، حذفه، وتعيينه افتراضي.
- **ملاحظة مخاطر:** التحقق من صلاحيات الوصول.

**11. الخطوة 2: ساعات الفني (1–8)، التأمين، إكسسوارات**
- **الهدف:** إكمال خطوة الإضافات حسب المواصفة.
- **الملفات:** `src/components/features/checkout/checkout-step-addons.tsx`, `checkout.store.ts` (addons)
- **التعديل:** إضافة حقل عدد ساعات (1–8) عند تفعيل الفني، خيار التأمين (نسبة)، قائمة إكسسوارات قابلة للإضافة/الحذف.
- **معايير القبول:** اختيار ساعات الفني، تفعيل التأمين، إدارة الإكسسوارات.
- **ملاحظة مخاطر:** قد يتطلب تغييرات في PricingService و create-session.

**12. زر رجوع بين الخطوات**
- **الهدف:** إمكانية العودة مع الحفاظ على البيانات.
- **الملفات:** `src/app/(public)/cart/page.tsx`, `CheckoutStepAddons`, `CheckoutStepReviewPay`
- **التعديل:** إضافة زر "رجوع" يستدعي `setStep(step - 1)`.
- **معايير القبول:** العودة من الخطوة 2 إلى 1، ومن 3 إلى 2، مع بقاء البيانات.
- **ملاحظة مخاطر:** لا.

**13. توحيد مدة قفل السعر**
- **الهدف:** تطابق الخادم والواجهة.
- **الملفات:** `src/app/api/checkout/lock-price/route.ts`, `src/components/features/checkout/price-lock-notice.tsx`
- **التعديل:** إما تغيير LOCK_TTL_MINUTES إلى 15 في lock-price، أو LOCK_TTL_SECONDS إلى 120*60 في price-lock-notice.
- **معايير القبول:** نفس المدة في الخادم والواجهة.
- **ملاحظة مخاطر:** تغيير الخادم إلى 15 دقيقة قد يؤثر على سياسة التسعير.

**14. استدعاء clearCheckout عند النجاح**
- **الهدف:** تفريغ حالة التشيك أوت بعد إتمام الطلب.
- **الملفات:** `src/components/features/checkout/inline-tap-payment.tsx`
- **التعديل:** قبل `window.location.href = data.redirectUrl`، استدعاء `useCheckoutStore.getState().clearCheckout()`.
- **معايير القبول:** عدم بقاء بيانات التشيك أوت بعد العودة من صفحة التأكيد.
- **ملاحظة مخاطر:** التأكد من أن clearCheckout يُستدعى قبل الانتقال (قد لا يُنفَّذ إذا كان redirect فوري).

**15. CSRF لمسارات POST**
- **الهدف:** حماية من هجمات CSRF.
- **الملفات:** middleware أو lib لـ CSRF، مسارات checkout و receivers.
- **التعديل:** إضافة توليد وتحقق من CSRF token في النماذج والـ API.
- **معايير القبول:** رفض الطلبات بدون token صالح.
- **ملاحظة مخاطر:** Next.js قد يوفر حماية افتراضية؛ مراجعة التوثيق.

**16. حذف تلقائي لصور الهوية بعد 30 يوم**
- **الهدف:** الامتثال لسياسة الاحتفاظ بالبيانات.
- **الملفات:** cron job أو scheduled task، أو API يُستدعى دورياً.
- **التعديل:** سكربت يحذف الملفات الأقدم من 30 يوماً من مجلد التخزين.
- **معايير القبول:** اختفاء الملفات القديمة تلقائياً.
- **ملاحظة مخاطر:** التأكد من عدم الحذف قبل ربطها بالـ booking.
