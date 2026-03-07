# تقرير: السلة، الفواتير، وعروض الأسعار
# Cart, Invoice & Quote Flow — Full System Report

## 1. المشكلة التي تم حلها (Problem Solved)

**قبل الإصلاح:** عناصر السلة للمعدات كانت تعرض فقط "معدة" بدون:
- اسم المعدة أو وصفها
- عدد أيام التأجير
- رابط لصفحة المعدة

**بعد الإصلاح:** كل عنصر يعرض:
- **اسم المعدة** (model أو sku) مع رابط لصفحة التفاصيل
- **عدد الأيام** (days)
- **الكمية × الأيام × السعر/يوم**
- **اسم الكيت** (للباقات/الكيتات)

---

## 2. بنية البيانات (Data Structures)

### CartItem (قاعدة البيانات)
```prisma
model CartItem {
  id            String       @id @default(cuid())
  cartId        String
  itemType      CartItemType  // EQUIPMENT | STUDIO | PACKAGE | KIT
  equipmentId   String?
  studioId      String?
  packageId     String?
  kitId         String?
  startDate     DateTime?
  endDate       DateTime?
  quantity      Int          @default(1)
  dailyRate     Decimal?
  subtotal      Decimal
  isAvailable   Boolean      @default(true)
  // ...
}
```

### CartItem (API Response — بعد الإثراء)
```typescript
{
  id, itemType, equipmentId, studioId, packageId, kitId,
  startDate, endDate, quantity, dailyRate, subtotal, isAvailable,
  // NEW: Enriched from Equipment/Kit tables
  equipmentName?: string | null   // model || sku
  equipmentSlug?: string | null   // for /equipment/[slug] link
  kitName?: string | null        // for KIT/PACKAGE items
  days: number                   // from startDate/endDate
}
```

### Invoice Item (بنود الفاتورة)
```typescript
{
  description: string   // e.g. "SKU-123 - Sony FX3 (2 × 3 days)"
  quantity: number
  unitPrice: number
  days?: number
  total: number
  vatRate?: number
  vatAmount?: number
}
```

### Quote Equipment Item (بنود عرض السعر)
```typescript
{
  equipmentId: string
  quantity: number
  dailyRate: number
  totalDays: number
  subtotal: number
  equipment: { id, sku, model }
}
```

---

## 3. ربط السلة بالفواتير (Cart → Invoice)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Cart      │     │   Checkout    │     │   Booking   │     │   Invoice    │
│   (سلة)     │ ──► │   (إتمام)    │ ──► │   (حجز)     │ ──► │   (فاتورة)   │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

**المسار:**
1. **Cart** → المستخدم يضيف معدات/استوديو/كيت إلى السلة
2. **Checkout** → `/api/checkout/create-session` ينشئ الحجز من محتويات السلة
3. **Booking** → `BookingService.create()` ينشئ Booking + BookingEquipment
4. **Invoice** → `InvoiceService.generateFromBooking()` ينشئ الفاتورة من الحجز

**الفواتير لا تُنشأ مباشرة من السلة.** السلة تُحوّل إلى حجز، ثم الفاتورة تُنشأ من الحجز.

```typescript
// create-session/route.ts
const cart = await CartService.getOrCreateCart(userId, sessionId)
// Extract equipment from cart items
for (const item of cart.items) {
  if (item.itemType === 'EQUIPMENT' && item.equipmentId && item.startDate && item.endDate) {
    equipment.push({ equipmentId: item.equipmentId, quantity: item.quantity })
  }
}
const booking = await BookingService.create({ equipment, ... }, userId)
```

```typescript
// InvoiceService.generateFromBooking()
const items = booking.equipment.map((be) => ({
  description: `${be.equipment.sku}${be.equipment.model ? ` - ${be.equipment.model}` : ''} (${be.quantity} × ${days} days)`,
  quantity: be.quantity,
  unitPrice: dailyPrice,
  days,
  total: dailyPrice * be.quantity * days,
  // ...
}))
```

---

## 4. ربط السلة بعروض الأسعار (Cart ↔ Quote)

**تم إضافة ربط كامل بين السلة وعروض الأسعار:**

| الرابط | API | الوصف |
|--------|-----|-------|
| **Quote → Cart** | `POST /api/quotes/[id]/add-to-cart` | العميل (صاحب العرض) يضيف بنود العرض إلى سلته |
| **Cart → Quote** | `POST /api/admin/cart/[cartId]/to-quote` | المدير ينشئ عرض سعر من سلة العميل |

**Quote → Cart:** العميل يفتح عرض السعر المرسل له، ويضغط "أضف للسلة" — تُنسخ المعدات والتواريخ إلى سلته.  
**Cart → Quote:** المدير يفتح سلة عميل معيّن وينشئ منها عرض سعر جاهز.

**علاقات قاعدة البيانات:**
- `Quote.cartId` — ربط العرض بالسلة عند إضافته للسلة
- `Booking.cartId` — ربط الحجز بالسلة عند الإتمام

---

## 5. الملفات المعدّلة (Files Changed)

| الملف | التعديل |
|-------|---------|
| `prisma/schema.prisma` | إضافة علاقات: CartItem→Equipment, CartItem→Kit, Booking→Cart, Quote→Cart |
| `prisma/migrations/20260227100000_add_cart_invoice_quote_links/` | Migration للعلاقات الجديدة |
| `src/lib/services/cart.service.ts` | إثراء السلة بـ equipmentName, kitName, categoryName, days عبر Prisma joins |
| `src/lib/stores/cart.store.ts` | تحديث واجهة `CartItem` |
| `src/components/features/cart/cart-item-row.tsx` | عرض الاسم، الأيام، الرابط |
| `src/lib/services/booking.service.ts` | دعم `cartId` عند إنشاء الحجز |
| `src/app/api/checkout/create-session/route.ts` | ربط الحجز بالسلة عند الإتمام |
| `src/lib/services/invoice.service.ts` | إثراء بنود الفاتورة بـ equipmentId, categoryId, categoryName |
| `src/lib/types/invoice.types.ts` | إضافة حقول equipmentId, categoryId للـ InvoiceItem |
| `src/lib/services/quote.service.ts` | إضافة `addQuoteToCart`, `createQuoteFromCart` |
| `src/app/api/quotes/[id]/add-to-cart/route.ts` | API: إضافة عرض السعر للسلة |
| `src/app/api/admin/cart/[cartId]/to-quote/route.ts` | API: إنشاء عرض سعر من السلة |
| `src/messages/*.json` | إضافة `cart.days`, `cart.day` |

---

## 6. توافق مع الفواتير وعروض الأسعار

**الفواتير:** تستخدم `description` من `equipment.sku` و `equipment.model` مع `quantity × days`.  
**عروض الأسعار:** تستخدم `QuoteEquipment` مع علاقة `equipment` لاسم المعدة.

السلة الآن تعرض نفس مستوى التفاصيل (الاسم، الأيام، الكمية) في واجهة المستخدم، مما يوفر تجربة متسقة مع الفواتير وعروض الأسعار.

---

## 7. ملخص التدفق

```
[المستخدم] → إضافة معدات للسلة (مع تواريخ)
     ↓
[Cart API] → إرجاع عناصر مع equipmentName, days, equipmentSlug
     ↓
[CartItemRow] → عرض: "Sony FX3" | "2 × 3 أيام × 500 ر.س/يوم"
     ↓
[Checkout] → إنشاء حجز من السلة
     ↓
[Booking] → BookingEquipment
     ↓
[Invoice] → بنود من الحجز: description, quantity, days, total
```
