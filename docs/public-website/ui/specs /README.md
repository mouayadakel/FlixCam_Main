# 📋 Advanced Specifications System

## نظام المواصفات المتطور - الدليل الشامل

هذا النظام يحول عرض المواصفات من جدول ممل إلى تجربة منظمة واحترافية مع دعم كامل للغتين العربية والإنجليزية.

---

## 🎯 المميزات الرئيسية

### ✨ Visual Enhancements
- **Hero Highlights Card**: عرض بصري لأهم 3-4 مواصفات في كارد مميز
- **Quick Spec Pills**: Pills قابلة للنقر تعرض المواصفات السريعة فوق التابات
- **Grouped Specifications**: تنظيم المواصفات في مجموعات منطقية مع أيقونات
- **Visual Indicators**: 
  - ✅/❌ للمواصفات Boolean
  - Progress bars للنطاقات الرقمية
  - Color gradients لدرجات الحرارة اللونية

### 🌍 Bilingual Support
- دعم كامل للعربية والإنجليزية
- كل label له نسخة عربية اختيارية
- RTL support تلقائي للعربية

### 📱 Responsive Design
- Desktop: Grid عرض بعمودين
- Mobile: Accordion قابل للطي
- تجربة ممتازة على جميع الأحجام

### 🔄 Backward Compatible
- يدعم البيانات القديمة (Flat format)
- يدعم البيانات الجديدة (Structured format)
- ما يحتاج migration للبيانات الموجودة

---

## 📁 File Structure

```
specifications/
├── types.ts                      # TypeScript type definitions
├── SpecificationsDisplay.tsx     # Main display component
├── SpecificationsEditor.tsx      # Admin editor component
├── specifications-utils.ts       # Helpers & sample data
├── ExampleIntegration.tsx        # Full integration example
└── README.md                     # This file
```

---

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
npm install lucide-react
```

### 2. Basic Usage (Frontend)

```tsx
import { SpecificationsDisplay } from '@/components/specifications/SpecificationsDisplay';

function EquipmentDetailPage({ equipment }) {
  return (
    <div>
      {/* ... other content ... */}
      
      <SpecificationsDisplay 
        specifications={equipment.specifications}
        locale="en" // or "ar"
      />
    </div>
  );
}
```

### 3. Admin Panel Usage

```tsx
import { SpecificationsEditor } from '@/components/specifications/SpecificationsEditor';

function EquipmentForm({ equipment, onChange }) {
  return (
    <div>
      <label>Specifications</label>
      <SpecificationsEditor
        value={equipment.specifications}
        onChange={(newSpecs) => onChange({ ...equipment, specifications: newSpecs })}
        categoryHint={equipment.category.name.toLowerCase()}
      />
    </div>
  );
}
```

---

## 📊 Data Structure

### Structured Format (الشكل الجديد)

```typescript
{
  // Hero highlights (3-4 max) - يظهر في الأعلى
  "highlights": [
    {
      "icon": "camera",
      "label": "Sensor",
      "value": "12.1MP",
      "sublabel": "Full-Frame BSI"
    }
  ],
  
  // Quick spec pills (4-6 max) - يظهر فوق التابات
  "quickSpecs": [
    {
      "icon": "aperture",
      "label": "Mount",
      "value": "E-Mount"
    }
  ],
  
  // Grouped detailed specs - المواصفات المفصلة
  "groups": [
    {
      "label": "Key Specs",
      "labelAr": "المواصفات الرئيسية",
      "icon": "star",
      "priority": 1,
      "specs": [
        {
          "key": "sensor",
          "label": "Sensor",
          "labelAr": "المستشعر",
          "value": "12.1MP Full-Frame BSI CMOS",
          "type": "text",        // text | boolean | range | colorTemp
          "highlight": true,     // يبرز هالمواصفة
          "rangePercent": 85     // للـ type: range فقط
        }
      ]
    }
  ]
}
```

### Flat Format (الشكل القديم - لا يزال مدعوم)

```typescript
{
  "sensor": "12.1MP Full-Frame BSI CMOS",
  "video": "4K 120p 10-bit 4:2:2",
  "iso": "80-102,400",
  "weight": "699g"
}
```

---

## 🎨 Specification Types

### 1. Text (default)
المواصفات النصية العادية
```json
{
  "key": "sensor",
  "label": "Sensor",
  "value": "12.1MP Full-Frame BSI CMOS",
  "type": "text"
}
```

### 2. Boolean
يعرض ✅ أو ❌
```json
{
  "key": "wifi",
  "label": "WiFi",
  "value": "Yes",
  "type": "boolean"
}
```

### 3. Range
يعرض progress bar
```json
{
  "key": "iso",
  "label": "ISO Range",
  "value": "80–102,400",
  "type": "range",
  "rangePercent": 85
}
```

### 4. Color Temperature
يعرض gradient ملون
```json
{
  "key": "colorTemp",
  "label": "Color Temperature",
  "value": "2800–10,000K",
  "type": "colorTemp"
}
```

---

## 🏷️ Category Templates

النظام يوفر templates جاهزة لكل كاتيقوري:

### Cameras
```typescript
{
  groups: [
    "Key Specs" (Sensor, Video, ISO, AF, IBIS),
    "Body & Display" (Weight, Dimensions, Display, EVF, Weather Sealed),
    "Storage & Power" (Card Slots, Battery, USB Charging),
    "Connectivity" (WiFi, Bluetooth, HDMI, Mount)
  ]
}
```

### Lighting
```typescript
{
  groups: [
    "Key Specs" (Type, Color Temp, CRI, Beam Angle, Dimming),
    "Power & I/O" (Power, AC Input, DC Input, Battery),
    "Physical" (Dimensions, Weight, Cooling, Protection),
    "Connectivity" (DMX, I/O, App Control)
  ]
}
```

### Lenses
```typescript
{
  groups: [
    "Key Specs" (Focal Length, Max Aperture, Mount, Format),
    "Optical" (Elements, Groups, Blades, MFD),
    "Physical" (Weight, Dimensions, Filter Thread, Weather)
  ]
}
```

### Audio
```typescript
{
  groups: [
    "Key Specs" (Type, Pattern, Frequency, Max SPL),
    "Connectivity" (Output, Phantom Power, Cable),
    "Physical" (Weight, Dimensions, Mount)
  ]
}
```

### Tripods
```typescript
{
  groups: [
    "Key Specs" (Max Load, Max/Min Height, Leg Sections),
    "Head & Mount" (Head Type, Quick Release, Pan/Tilt),
    "Physical" (Weight, Folded Length, Material)
  ]
}
```

### Monitors
```typescript
{
  groups: [
    "Key Specs" (Size, Resolution, Brightness, Aspect Ratio),
    "Display" (Panel Type, Touchscreen, Color Gamut),
    "Connectivity" (HDMI, SDI, USB),
    "Power & Physical" (Power Input, Battery Mount, Weight)
  ]
}
```

---

## 🔧 Utility Functions

### Convert Flat to Structured
```typescript
import { convertFlatToStructured } from '@/lib/specifications-utils';

const flatSpecs = {
  sensor: "12.1MP",
  video: "4K 120p",
  weight: "699g"
};

const structured = convertFlatToStructured(flatSpecs, 'cameras');
```

### Auto-Extract Quick Specs
```typescript
import { extractQuickSpecs } from '@/lib/specifications-utils';

const quickSpecs = extractQuickSpecs(structuredSpecs, 4);
// Returns top 4 highlighted specs
```

### Auto-Extract Highlights
```typescript
import { extractHighlights } from '@/lib/specifications-utils';

const highlights = extractHighlights(structuredSpecs, 4);
// Returns top 4 specs from "Key Specs" group
```

### Validate Specifications
```typescript
import { validateSpecifications } from '@/lib/specifications-utils';

const { valid, errors } = validateSpecifications(specs);
if (!valid) {
  console.error('Validation errors:', errors);
}
```

---

## 🎨 Customization

### Custom Icons
أضف أيقونات جديدة في `SpecificationsDisplay.tsx`:

```typescript
const iconMap = {
  // ... existing icons
  myCustomIcon: MyCustomIconComponent
};
```

### Custom Colors
عدّل الألوان في `tailwind.config.js` أو مباشرة:

```typescript
// Brand color
className="text-brand-primary"

// Custom color
className="text-blue-500"
```

### Custom Spec Types
أضف type جديد في `SpecificationsDisplay.tsx`:

```typescript
// Add to spec type union
type?: 'text' | 'boolean' | 'range' | 'colorTemp' | 'myCustomType'

// Add renderer
{spec.type === 'myCustomType' && (
  <MyCustomRenderer value={spec.value} />
)}
```

---

## 📱 Responsive Behavior

### Desktop (≥768px)
- Groups displayed in 2-column grid
- All groups visible simultaneously
- Hover effects enabled

### Mobile (<768px)
- Groups displayed as accordion
- One group expanded at a time
- Touch-optimized

---

## 🌍 Internationalization

### RTL Support
الكومبوننت يدعم RTL تلقائياً عند استخدام locale="ar":

```tsx
<SpecificationsDisplay 
  specifications={specs}
  locale="ar"
/>
```

### Translation Priority
1. إذا كان `locale="ar"` والـ `labelAr` موجود → يستخدم العربي
2. إذا ما في عربي → يستخدم الإنجليزي
3. Always fallback to English

---

## 🔄 Migration Guide

### من الشكل القديم للجديد

#### Option 1: Automatic (Recommended)
الكومبوننت يدعم البيانات القديمة تلقائياً - ما تحتاج تسوي شي!

#### Option 2: Manual Migration
```typescript
import { convertFlatToStructured } from '@/lib/specifications-utils';

// In your data migration script
const oldSpecs = {
  sensor: "12.1MP",
  video: "4K 120p"
};

const newSpecs = convertFlatToStructured(
  oldSpecs,
  'cameras' // category hint
);

// Save newSpecs to database
```

#### Option 3: Bulk Migration
```typescript
// Example bulk migration script
async function migrateAllSpecs() {
  const products = await prisma.product.findMany({
    where: {
      specifications: { not: null }
    }
  });

  for (const product of products) {
    if (!isStructuredSpecifications(product.specifications)) {
      const structured = convertFlatToStructured(
        product.specifications,
        product.category.name.toLowerCase()
      );

      await prisma.product.update({
        where: { id: product.id },
        data: { specifications: structured }
      });
    }
  }
}
```

---

## 💡 Best Practices

### 1. Specification Grouping
- احط أهم المواصفات في "Key Specs" group
- رتب الـ groups حسب الأهمية (priority)
- كل group لازم يكون له معنى واضح

### 2. Highlighting
- استخدم `highlight: true` للمواصفات المهمة (5-7 max)
- المواصفات المبرزة تكون decision factors للعميل

### 3. Quick Specs
- 4-6 specs كافية
- اختار المواصفات اللي يحتاجها العميل بسرعة
- مثال: Mount, Weight, Resolution

### 4. Highlights
- 3-4 highlights ideal
- يفضل يكون فيها main value + sublabel
- مثال: "12.1MP" + "Full-Frame BSI"

### 5. Labels
- استخدم labels واضحة ومختصرة
- ترجم المهم للعربي
- تجنب المصطلحات التقنية جداً

### 6. Values
- كن دقيق في القيم
- استخدم الوحدات الصحيحة
- للـ ranges استخدم "–" مو "-"

---

## 🐛 Troubleshooting

### المواصفات ما تظهر
```typescript
// تأكد إن البيانات موجودة
console.log(equipment.specifications);

// تأكد إن الكومبوننت مستورد صح
import { SpecificationsDisplay } from './SpecificationsDisplay';
```

### الأيقونات ما تظهر
```bash
# تأكد إن lucide-react مثبت
npm install lucide-react
```

### الترجمة ما تشتغل
```typescript
// تأكد إنك مارر الـ locale
<SpecificationsDisplay 
  specifications={specs}
  locale="ar" // or "en"
/>
```

### الـ Range Bars ما تتحرك
```typescript
// تأكد إن rangePercent موجود وبين 0-100
{
  "type": "range",
  "rangePercent": 85 // ✅
}
```

---

## 📚 Examples

### مثال كامل: كاميرا Sony A7S III
```typescript
const sonyA7SIII = {
  highlights: [
    { icon: "camera", label: "Sensor", value: "12.1MP", sublabel: "Full-Frame BSI" },
    { icon: "video", label: "Video", value: "4K 120p", sublabel: "10-bit 4:2:2" },
    { icon: "scale", label: "Weight", value: "699g", sublabel: "Body Only" },
    { icon: "battery", label: "Battery", value: "NP-FZ100", sublabel: "~600 shots" }
  ],
  quickSpecs: [
    { icon: "aperture", label: "Mount", value: "E-Mount" },
    { icon: "monitor", label: "EVF", value: "9.44M-dot OLED" }
  ],
  groups: [
    {
      label: "Key Specs",
      labelAr: "المواصفات الرئيسية",
      icon: "star",
      priority: 1,
      specs: [
        {
          key: "sensor",
          label: "Sensor",
          labelAr: "المستشعر",
          value: "12.1MP Full-Frame Exmor R BSI CMOS",
          highlight: true
        }
      ]
    }
  ]
};
```

---

## 🎯 Roadmap

### Phase 1 ✅ (Current)
- [x] Basic structured format
- [x] Grouped display
- [x] Visual enhancements
- [x] Backward compatibility
- [x] Admin editor
- [x] Category templates

### Phase 2 (Future)
- [ ] Comparison feature (مقارنة بين منتجات)
- [ ] Spec search/filter
- [ ] Export to PDF
- [ ] Print-friendly view
- [ ] Accessibility improvements (ARIA)

### Phase 3 (Ideas)
- [ ] AI-powered spec extraction from PDFs
- [ ] Automatic spec validation
- [ ] Spec translation automation
- [ ] Interactive 3D specs visualization

---

## 📄 License

هذا الكود جزء من مشروعك وتقدر تستخدمه وتعدله كيف ما تبي.

---

## 🤝 Contributing

إذا عندك أفكار أو تحسينات:
1. جرب التعديل
2. اختبره على أكثر من منتج
3. شير الكود مع الفريق

---

## 📞 Support

إذا واجهتك مشكلة أو عندك سؤال:
1. راجع الـ Troubleshooting section
2. شوف الأمثلة في ExampleIntegration.tsx
3. اسأل الفريق

---

**Happy Coding! 🚀**
