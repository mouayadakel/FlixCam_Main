# تقرير حالة نظام المواصفات (Specifications System) — وثيقة للمهندس

**التاريخ:** 25 فبراير 2026  
**الغرض:** وصف شامل لحالة نظام المواصفات لتمكين مهندس البرمجيات من إصلاح الخلل.

---

## 1. نظرة عامة على البنية

### 1.1 مصادر البيانات

| المصدر | الجدول/النموذج | الحقل | النوع |
|--------|-----------------|-------|-------|
| **Equipment** | `Equipment` | `specifications` | `Json?` |
| **Product** | `ProductTranslation` | `specifications` | `Json?` |

- **Equipment** هو المصدر الرئيسي للعرض العام (صفحة المعدات للزوار).
- **Product** يُستخدم في الاستيراد، AI، والـ sync مع Equipment.
- الـ sync يتم عبر `product-equipment-sync.service.ts`: المواصفات تُنسخ من `ProductTranslation.specifications` (en) إلى `Equipment.specifications`.

### 1.2 صيغ المواصفات

| الصيغة | الوصف | الملفات |
|--------|-------|----------|
| **Flat** | `Record<string, string \| number \| boolean>` | Legacy، استيراد، AI خام |
| **Structured** | `{ highlights?, quickSpecs?, groups: SpecGroup[] }` | العرض، التحرير، AI منسق |

---

## 2. الملفات الرئيسية

### 2.1 الأنواع والتعريفات

| الملف | الغرض |
|-------|-------|
| `src/lib/types/specifications.types.ts` | `SpecItem`, `SpecGroup`, `SpecHighlight`, `QuickSpec`, `StructuredSpecifications`, `FlatSpecifications`, `isStructuredSpecifications`, `isFlatSpecifications` |

### 2.2 الخدمات والـ Utilities

| الملف | الغرض |
|-------|-------|
| `src/lib/utils/specifications.utils.ts` | `flattenStructuredSpecs`, `getSpecValue`, `getSpecArray`, `convertFlatToStructured`, `categoryTemplates`, `validateSpecifications` |
| `src/lib/ai/spec-templates.ts` | `CATEGORY_SPEC_TEMPLATES`, `getExpectedSpecs`, `resolveTemplateName` — قوالب المفاتيح للـ AI |
| `src/lib/services/ai-spec-parser.service.ts` | `inferMissingSpecs` — استنتاج المواصفات عبر LLM |
| `src/lib/services/spec-parser.service.ts` | Removed (deprecated); use ai-spec-parser.service only |

### 2.3 واجهات الـ API

| المسار | الغرض |
|--------|-------|
| `POST /api/admin/equipment/ai-suggest` | اقتراح AI: وصف، SEO، مواصفات، box contents، tags |
| `POST /api/admin/equipment/fetch-specs` | استخراج مواصفات من URL صفحة منتج |
| `POST /api/admin/equipment/migrate-specs` | تحويل Flat → Structured لكل المعدات |

### 2.4 المكونات

| الملف | الغرض |
|-------|-------|
| `src/components/features/equipment/specifications-display.tsx` | عرض المواصفات (Structured أو Flat) |
| `src/components/forms/specifications-editor.tsx` | تحرير المواصفات في لوحة الإدارة |

---

## 3. خلل حرج: عدم تطابق المفاتيح (Key Mismatch)

### 3.1 الوصف

**spec-templates.ts** (يُستخدم في AI inference) يعرّف مفاتيح مثل:

- Cameras: `sensor_size`, `weight_kg`, `mount_type`, `max_video_resolution`, `base_iso`, `max_iso`
- Lenses: `focal_length`, `max_aperture`, `mount_type`, `image_circle`
- Lighting: `power_watts`, `color_temp_range`, `cri`, `output_lux_1m`

**categoryTemplates** في `specifications.utils.ts` (يُستخدم في `convertFlatToStructured`) يعرّف مفاتيح مختلفة:

- cameras: `sensor`, `video`, `iso`, `weight`, `dimensions`, `display`, `mount`, `recording`, `battery`, `wifi`, `bluetooth`, `hdmi`
- lenses: `focalLength`, `maxAperture`, `mount`, `format`, `elements`, `groups`, `blades`, `mfd`, `weight`, `dimensions`, `filterThread`, `weather`
- lighting: `type`, `colorTemp`, `cri`, `beamAngle`, `dimming`, `output`, `lumens`, إلخ

### 3.2 النتيجة

عند استدعاء `convertFlatToStructured(mergedSpecs, "Cameras")`:

1. الـ AI يعيد `sensor_size`, `weight_kg`, `mount_type` إلخ.
2. القالب يبحث عن `sensor`, `weight`, `mount` — **لا يوجد تطابق**.
3. جميع المواصفات المستنتجة تُضاف إلى `remaining` وتُدفع إلى `groups[0]` كمواصفات إضافية.
4. حقول القالب تبقى فارغة، والمواصفات تظهر في مجموعة واحدة غير منظمة.

### 3.3 الحل المقترح

**الخيار أ:** إضافة خريطة تلقائية للمفاتيح في `convertFlatToStructured`:

```typescript
const KEY_ALIASES: Record<string, string> = {
  sensor_size: 'sensor',
  weight_kg: 'weight',
  dimensions_cm: 'dimensions',
  mount_type: 'mount',
  max_video_resolution: 'video',
  base_iso: 'iso',
  max_iso: 'iso',
  focal_length: 'focalLength',
  max_aperture: 'maxAperture',
  // ... إلخ
}
```

**الخيار ب:** توحيد القوالب — جعل `categoryTemplates` يستخدم نفس المفاتيح الموجودة في `CATEGORY_SPEC_TEMPLATES`.

**الخيار ج:** جعل الـ AI prompt يطلب المفاتيح المطابقة لـ `categoryTemplates` بدلاً من `spec-templates`.

---

## 4. خلل: تعدد قوالب الفئات

### 4.1 الفئات في spec-templates

`Cameras`, `Lenses`, `Lighting`, `Audio`, `Grip`, `Monitors`, `Stabilizers`, `Drones`, `Power`, `Recorders`, `Wireless`, `Accessories`

### 4.2 الفئات في categoryTemplates

`cameras`, `lighting`, `lenses`, `audio`, `tripods`, `monitors`, `stabilizers`, `drones`, `power`, `recorders`, `wireless`

### 4.3 الفروقات

- **Grip** في spec-templates يقابله **tripods** في categoryTemplates — قد لا يُطابق.
- **Accessories** موجود في spec-templates فقط — لا يوجد قالب structured له.
- `resolveTemplateName` في spec-templates يرجع أسماء مثل `Cameras`، بينما `categoryTemplates` يستخدم `cameras` (lowercase) — يُعالج عبر `categoryHint.toLowerCase()`.

---

## 5. خلل: تعدد مصادر الحقيقة

### 5.1 قوالب المفاتيح

- `CATEGORY_SPEC_TEMPLATES` في `spec-templates.ts` — للـ AI inference (~95 مفتاح للكاميرات).
- `categoryTemplates` في `specifications.utils.ts` — للتحويل والعرض (~20 مفتاح للكاميرات).

### 5.2 قوالب الـ highlights

في `ai-suggest/route.ts`:

```typescript
const topHighlightKeys: Record<string, string[]> = {
  Cameras: ['sensor_size', 'max_video_resolution', 'codec', 'mount_type'],
  Lenses: ['focal_length', 'max_aperture', 'mount_type', 'image_circle'],
  // ...
}
```

هذه المفاتيح تتطابق مع `spec-templates`، لكن `categoryTemplates` يستخدم `sensor`, `video`, `mount` — تناقض.

---

## 6. خلل: getSpecsCompleteness لا يدعم Structured

في `content-health.service.ts`:

```typescript
function getSpecsCompleteness(specifications: unknown): number {
  if (specifications == null || typeof specifications !== 'object') return 0
  const obj = specifications as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return 1  // ← Structured له groups وليس keys مباشرة!
  const filled = keys.filter((k) => isFilled(obj[k]))
  return filled.length / keys.length
}
```

- للـ **Flat**: `Object.keys(obj)` يعيد المفاتيح الصحيحة.
- للـ **Structured**: `obj` له `groups`, `highlights`, `quickSpecs` — `Object.keys` يعيد هذه المفاتيح وليس مفاتيح المواصفات الفعلية.
- النتيجة: حساب الـ completeness خاطئ للمواصفات المنظمة.

**الحل:** التحقق من `isStructuredSpecifications` واستخدام `flattenStructuredSpecs` أو عد الـ specs داخل `groups`.

---

## 7. خلل أمني: XSS في المواصفات

من `ADMIN_CONTROL_PANEL_AUDIT_REPORT.md`:

- `equipment.specifications.html` و `equipment.boxContents` يُعرضان بـ `dangerouslySetInnerHTML` بدون تعقيم.
- إذا كانت المواصفات أو محتويات الصندوق قادمة من استيراد أو AI، قد تحتوي على HTML خبيث.

**الحل:** استخدام DOMPurify أو عرض النص كـ plain text.

---

## 8. خلل: flattenStructuredSpecs يفقد القيم غير النصية

```typescript
export function flattenStructuredSpecs(specs: StructuredSpecifications): Record<string, string> {
  const out: Record<string, string> = {}
  for (const group of specs.groups) {
    for (const spec of group.specs) {
      if (spec.key) out[spec.key] = spec.value  // spec.value قد يكون number/boolean
    }
  }
  return out
}
```

`SpecItem.value` معرف كـ `string` في الأنواع، لكن في الواقع قد يأتي كـ `number` أو `boolean` من JSON. التحويل إلى string ضروري: `out[spec.key] = String(spec.value ?? '')`.

---

## 9. خلل: convertFlatToStructured — نوع entries

```typescript
const entries = Object.entries(flatSpecs).filter(([key]) => !RESERVED_KEYS.includes(key)) as [
  string,
  string,
][]
```

`flatSpecs` قد يحتوي على `number` أو `boolean` — الـ cast إلى `[string, string][]` غير دقيق. يجب تحويل القيم: `String(pair[1] ?? '')`.

---

## 10. خلل: Product vs Equipment — مصدر المواصفات

- **Product**: المواصفات في `ProductTranslation.specifications` (لكل locale).
- **Equipment**: المواصفات في `Equipment.specifications` (نسخة واحدة).

عند التحرير من لوحة المعدات، التعديل يذهب إلى `Equipment.specifications` مباشرة. لا يوجد sync عكسي تلقائي إلى `ProductTranslation` — قد يحدث انفصال بين المنتج والمعدة.

---

## 11. خلل: SpecificationsEditor وقيمة افتراضية

`SpecificationsEditor` يستقبل `value` كـ `Record<string, unknown> | StructuredSpecifications`.

عند `categoryHint` مختلف عن القالب المخزن، `convertFlatToStructured` قد يعيد توزيعاً مختلفاً — قد يُفقد تنظيم المجموعات عند تغيير الفئة.

---

## 12. خلل: AI Suggest — ترجمة category name

`resolveTemplateName(category?.name ?? 'Equipment')` يعيد اسم الفئة بالإنجليزية (مثل `Cameras`).

أسماء الفئات في قاعدة البيانات قد تكون بالعربية أو بصيغ مختلفة. يجب التحقق من أن `Category.name` يُربط بشكل صحيح مع `CATEGORY_ALIASES` و `categoryTemplates`.

---

## 13. خلل: specBlacklist, specConfidence, specLastInferredAt

في Prisma schema (من migrations):

- `specBlacklist` (JSONB)
- `specConfidence` (Double)
- `specLastInferredAt` (DateTime)
- `specSource` (String)

يجب التأكد من أن هذه الحقول مستخدمة فعلياً في:
- منع حفظ مواصفات في الـ blacklist
- عرض مستوى الثقة للمستخدم
- عدم إعادة الاستنتاج إذا كانت البيانات حديثة

---

## 14. قائمة الملفات المتأثرة

| الملف | التعديل المقترح |
|-------|-----------------|
| `src/lib/utils/specifications.utils.ts` | إضافة KEY_ALIASES، إصلاح convertFlatToStructured |
| `src/lib/ai/spec-templates.ts` | توحيد المفاتيح مع categoryTemplates أو العكس |
| `src/lib/services/content-health.service.ts` | دعم Structured في getSpecsCompleteness |
| `src/app/api/admin/equipment/ai-suggest/route.ts` | توحيد topHighlightKeys مع القوالب |
| `src/components/features/equipment/specifications-display.tsx` | التحقق من sanitization إن وُجد HTML |
| `src/app/admin/(routes)/inventory/equipment/[id]/page.tsx` | تطبيق DOMPurify على specifications/boxContents |
| `src/lib/services/product-equipment-sync.service.ts` | توثيق اتجاه الـ sync (Product → Equipment) |

---

## 15. خريطة تدفق البيانات

```
[استيراد Excel] ──► ProductTranslation.specifications (flat)
        │
        ▼
[AI Suggest] ──► inferMissingSpecs (spec-templates keys) ──► mergedSpecs (flat)
        │
        ▼
convertFlatToStructured(mergedSpecs, category) ──► StructuredSpecifications
        │
        │  ⚠️ Key mismatch: AI keys ≠ categoryTemplate keys
        │
        ▼
[حفظ] ──► Equipment.specifications (أو ProductTranslation عند الاستيراد)
        │
        ▼
[عرض] ──► SpecificationsDisplay ──► Structured أو FlatSpecsTable
```

---

## 16. توصيات أولوية الإصلاح

| الأولوية | الخلل | الجهد التقديري |
|----------|-------|-----------------|
| P0 | Key mismatch بين spec-templates و categoryTemplates | 2–4 ساعات |
| P0 | getSpecsCompleteness للـ Structured | 1 ساعة |
| P1 | XSS في specifications/boxContents | 1–2 ساعة |
| P1 | توحيد قوالب الفئات (Grip/tripods، Accessories) | 1–2 ساعة |
| P2 | flattenStructuredSpecs للقيم غير النصية | 30 دقيقة |
| P2 | استخدام specBlacklist/specConfidence في الـ UI | 2–3 ساعات |
| P3 | توثيق Product ↔ Equipment sync | 30 دقيقة |

---

## 17. متغيرات البيئة المطلوبة

```
OPENAI_API_KEY=        # للـ AI inference (GPT-4o-mini)
GEMINI_API_KEY=        # أو GOOGLE_GENERATIVE_AI_API_KEY (Gemini 2.0 Flash)
AI_PROVIDER=gemini     # أو openai
```

---

## 18. أوامر الاختبار

```bash
# تشغيل التطبيق
npm run dev

# التحقق من الـ schema
npx prisma validate

# تشغيل الـ migrate للمواصفات (إن وُجد)
npm run migrate:specs   # إن كان معرفاً في package.json
```

---

**نهاية التقرير**
