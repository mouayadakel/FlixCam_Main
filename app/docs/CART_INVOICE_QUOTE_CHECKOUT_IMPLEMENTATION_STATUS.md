# تقرير حالة التنفيذ: السلة، الفواتير، عروض الأسعار، والتشيك أوت

**المصدر:** مقارنة [CART_INVOICE_QUOTE_FLOW.md](CART_INVOICE_QUOTE_FLOW.md) مع الكود الفعلي  
**التاريخ:** 2026-02-26

---

## 1. ملخص تنفيذي

| العنصر | الحالة | ملاحظات |
|--------|--------|---------|
| **Cart → Checkout → Booking** | منفذ بالكامل | create-session ينشئ الحجز من السلة ويربط cartId |
| **Booking → Invoice** | منفذ (يدوي) | generateFromBooking موجود لكن لا يُستدعى تلقائياً من التشيك أوت |
| **Quote → Cart** | منفذ | API و QuoteService.addQuoteToCart |
| **Cart → Quote** | منفذ | API و QuoteService.createQuoteFromCart |
| **إثراء السلة** | منفذ | equipmentName, days, kitName, equipmentSlug |
| **عرض CartItemRow** | منفذ | الاسم، الأيام، الرابط، الكمية × الأيام × السعر |
| **ربط سند/أمر بالفواتير** | غير واضح في الوثيقة | لا يوجد نموذج "Order" منفصل؛ الحجز (Booking) هو الأمر |

---

## 2. ما هو منفذ من الوثيقة (CART_INVOICE_QUOTE_FLOW)
ش
### 2.1 بنية البيانات

| العنصر | الملف | الحالة |
|--------|-------|--------|
| CartItem مع equipmentId, studioId, kitId, startDate, endDate | `prisma/schema.prisma` | منفذ |
| CartItem API Response مع equipmentName, equipmentSlug, kitName, days | `cart.service.ts` → `toCartWithItemsWithEnrichment` | منفذ |
| Invoice Item مع description, quantity, days, total | `invoice.service.ts` generateFromBooking | منفذ |
| Invoice Item مع equipmentId, categoryId, categoryName | `invoice.types.ts` + `invoice.service.ts` | منفذ (أكثر من الوثيقة) |

### 2.2 التدفق Cart → Checkout → Booking

| الخطوة | الملف | الحالة |
|--------|-------|--------|
| CartService.getOrCreateCart | `create-session/route.ts` | منفذ |
| استخراج equipment من cart.items | `create-session/route.ts` (سطور 70–85) | منفذ |
| دعم KIT/PACKAGE (تفكيك إلى equipment) | `create-session/route.ts` | منفذ |
| BookingService.create مع cartId | `create-session/route.ts` سطر 123، `booking.service.ts` سطر 204 | منفذ |

### 2.3 التدفق Booking → Invoice

| العنصر | الملف | الحالة |
|--------|-------|--------|
| InvoiceService.generateFromBooking | `invoice.service.ts` سطور 635–736 | منفذ |
| بنود الفاتورة: description من sku + model + quantity × days | `invoice.service.ts` سطور 703–719 | منفذ |
| API POST /api/invoices/generate/[bookingId] | `src/app/api/invoices/generate/[bookingId]/route.ts` | منفذ |

**ملاحظة:** الفاتورة لا تُنشأ تلقائياً أثناء التشيك أوت. يتم إنشاؤها عبر استدعاء API منفصل (عادة من لوحة الإدارة أو عملية أخرى).

### 2.4 Quote ↔ Cart

| الرابط | API | الحالة |
|--------|-----|--------|
| Quote → Cart | `POST /api/quotes/[id]/add-to-cart` | منفذ |
| Cart → Quote | `POST /api/admin/cart/[cartId]/to-quote` | منفذ |
| QuoteService.addQuoteToCart | `quote.service.ts` سطر 859 | منفذ |
| QuoteService.createQuoteFromCart | `quote.service.ts` سطر 933 | منفذ |

### 2.5 Migration والعلاقات

| العنصر | الملف | الحالة |
|--------|-------|--------|
| CartItem → Equipment FK | `20260227100000_add_cart_invoice_quote_links` | منفذ |
| CartItem → Kit FK | نفس الـ migration | منفذ |
| Booking.cartId | نفس الـ migration | منفذ |
| Quote.cartId | نفس الـ migration | منفذ |

### 2.6 واجهة المستخدم

| العنصر | الملف | الحالة |
|--------|-------|--------|
| عرض equipmentName, kitName, studioName | `cart-item-row.tsx` | منفذ |
| عرض days و quantity × days × unitPrice | `cart-item-row.tsx` | منفذ |
| رابط لصفحة المعدة (equipmentSlug) | `cart-item-row.tsx` | منفذ |
| cart.days, cart.day في الترجمات | `messages/*.json` | يُفترض منفذ (يُستخدم في CartItemRow) |

---

## 3. ما لم يُنفذ أو يختلف عن الوثيقة

### 3.1 إنشاء الفاتورة تلقائياً

- **الوثيقة:** "Invoice → InvoiceService.generateFromBooking() ينشئ الفاتورة من الحجز"
- **الواقع:** الفاتورة تُنشأ عبر `POST /api/invoices/generate/[bookingId]` ولا يُستدعى هذا الـ API من مسار التشيك أوت أو صفحة التأكيد.
- **النتيجة:** الفاتورة تُنشأ يدوياً (من لوحة الإدارة أو عملية منفصلة).

### 3.2 تواريخ المعدات في create-session

- **الوثيقة (مقتطف):** يذكر التحقق من `startDate` و `endDate` لعناصر EQUIPMENT.
- **الواقع:** الكود يضيف equipment بدون التحقق الصريح من وجود التواريخ لكل عنصر. يتم استخدام `startDate` و `endDate` من السلة بشكل عام للحجز.

### 3.3 صفحة "أضف للسلة" من عرض السعر

- **الوثيقة:** "العميل يفتح عرض السعر المرسل له، ويضغط «أضف للسلة»"
- **الواقع:** الـ API موجود، لكن لا توجد واجهة مستخدم مؤكدة لزر "أضف للسلة" في صفحة عرض السعر (يحتاج تحقق).

---

## 4. ما هو ناقص أو غير مرتبط مباشرة بالوثيقة

### 4.1 سند الأمر (Order Document)

- **الوثيقة:** لا تذكر نموذج "سند" أو "أمر" صريحاً.
- **النظام:** لا يوجد نموذج `Order` منفصل. الحجز (Booking) يمثل الطلب، والفاتورة (Invoice) تمثل سند الفاتورة.
- **الربط:** `Booking` ← `Invoice` عبر `bookingId`. الفاتورة تُنشأ من الحجز وتحتوي على بنود من `BookingEquipment`.

### 4.2 ربط التشيك أوت بالوثيقة

| العنصر | العلاقة |
|--------|---------|
| **create-session** | يستخدم CartService، ينشئ Booking مع cartId، لا ينشئ Invoice |
| **inline-tap-payment** | يستدعي create-session ثم يوجّه لـ TAP أو صفحة التأكيد |
| **checkout-step-receiver** | يجمع بيانات المستلم والاستلام |
| **checkout-form (CMS)** | نموذج ديناميكي من قاعدة البيانات |
| **promissory-note** | صفحة إقرار قبل الدفع (إن كان مفعّلاً) |

التشيك أوت مرتبط بالسلة والحجز، وغير مرتبط مباشرة بإنشاء الفاتورة.

### 4.3 عناصر قد تكون ناقصة

| العنصر | الوصف |
|--------|-------|
| **إنشاء فاتورة تلقائي** | بعد تأكيد الدفع أو تغيير حالة الحجز، قد يُرغب في استدعاء generateFromBooking تلقائياً. |
| **واجهة "أضف للسلة" من Quote** | زر أو رابط في صفحة عرض السعر يستدعي `/api/quotes/[id]/add-to-cart`. |
| **ربط Invoice بـ Cart** | الوثيقة تربط Cart → Booking → Invoice. لا يوجد حقل `cartId` في Invoice؛ الربط عبر `bookingId` فقط. |

---

## 5. الملفات المرتبطة بالتشيك أوت والسند/الفاتورة

### 5.1 التشيك أوت

| الملف | الدور |
|-------|-------|
| `src/app/(public)/cart/page.tsx` | صفحة السلة مع خطوات الإتمام المدمجة |
| `src/app/(public)/checkout/page.tsx` | إعادة توجيه إلى /cart?expandCheckout=1 |
| `src/app/api/checkout/create-session/route.ts` | إنشاء الحجز من السلة |
| `src/app/api/checkout/lock-price/route.ts` | قفل السعر (يستخدم cartId) |
| `src/app/api/checkout/form-config/route.ts` | تكوين نموذج التشيك أوت من CMS |
| `src/components/features/checkout/*` | مكونات خطوات الإتمام |
| `src/lib/stores/checkout.store.ts` | حالة التشيك أوت |

### 5.2 السلة والحجز

| الملف | الدور |
|-------|-------|
| `src/lib/services/cart.service.ts` | إدارة السلة وإثراء العناصر |
| `src/lib/services/booking.service.ts` | إنشاء الحجز (يدعم cartId) |
| `src/components/features/cart/cart-item-row.tsx` | عرض عنصر السلة |

### 5.3 الفاتورة (سند الفاتورة)

| الملف | الدور |
|-------|-------|
| `src/lib/services/invoice.service.ts` | إنشاء الفاتورة، generateFromBooking |
| `src/lib/types/invoice.types.ts` | أنواع Invoice و InvoiceItem |
| `src/app/api/invoices/generate/[bookingId]/route.ts` | API لإنشاء فاتورة من حجز |

### 5.4 عروض الأسعار

| الملف | الدور |
|-------|-------|
| `src/lib/services/quote.service.ts` | addQuoteToCart, createQuoteFromCart |
| `src/app/api/quotes/[id]/add-to-cart/route.ts` | إضافة عرض السعر للسلة |
| `src/app/api/admin/cart/[cartId]/to-quote/route.ts` | إنشاء عرض سعر من السلة |

---

## 6. مخطط الربط النهائي

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌──────────────┐
│   Cart      │     │   Checkout        │     │   Booking   │     │   Invoice    │
│   (سلة)     │ ──► │   create-session │ ──► │   (حجز)     │ ──► │   (فاتورة)   │
│             │     │   + cartId       │     │   + cartId  │     │   يدوي/API   │
└─────────────┘     └──────────────────┘     └─────────────┘     └──────────────┘
       ▲                      │                      │
       │                      │                      │
       │              ┌───────┴───────┐              │
       │              │ Quote         │              │
       └──────────────│ add-to-cart   │              │
                      │ to-quote      │              │
                      └───────────────┘              │
                                                     │
                              POST /api/invoices/generate/[bookingId]
```

---

## 7. التوصيات

1. **توثيق إنشاء الفاتورة:** توضيح في الوثيقة أن الفاتورة تُنشأ عبر API منفصل وليس تلقائياً من التشيك أوت.
2. **إنشاء فاتورة تلقائي (اختياري):** عند تأكيد الدفع أو تغيير حالة الحجز إلى CONFIRMED، استدعاء generateFromBooking إذا لم تكن الفاتورة موجودة.
3. **واجهة "أضف للسلة" من Quote:** التحقق من وجود زر في صفحة عرض السعر يستدعي `/api/quotes/[id]/add-to-cart`. إن لم يكن موجوداً، إضافته.
