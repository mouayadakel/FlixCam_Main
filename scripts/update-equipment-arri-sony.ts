/**
 * Updates equipment-import-from-flix-stock.xlsx with ARRI Alexa 35 and Sony A7R V
 * full content (names, descriptions, SEO, tags, box contents, specs).
 *
 * Usage: npx tsx scripts/update-equipment-arri-sony.ts
 */

import * as path from 'path'
import ExcelJS from 'exceljs'

const XLSX_PATH = path.join(process.cwd(), 'docs/templates/equipment-import-from-flix-stock.xlsx')

const TEMPLATE_COLS = [
  'sku', 'model', 'category_slug', 'brand_slug', 'condition', 'quantityTotal', 'quantityAvailable',
  'dailyPrice', 'weeklyPrice', 'monthlyPrice', 'purchasePrice', 'depositAmount', 'requiresDeposit',
  'featured', 'isActive', 'requiresAssistant', 'budgetTier', 'warehouseLocation', 'barcode', 'tags',
  'boxContents', 'bufferTime', 'bufferTimeUnit', 'featuredImageUrl', 'galleryImageUrls', 'videoUrl',
  'name_ar', 'name_en', 'name_zh', 'description_ar', 'description_en', 'description_zh',
  'shortDescription_ar', 'shortDescription_en', 'shortDescription_zh',
  'longDescription_ar', 'longDescription_en', 'longDescription_zh',
  'seoTitle_ar', 'seoTitle_en', 'seoTitle_zh', 'seoDescription_ar', 'seoDescription_en', 'seoDescription_zh',
  'seoKeywords_ar', 'seoKeywords_en', 'seoKeywords_zh', 'specifications_notes',
]

const ARRI_ALEXA_35: Record<string, string | number | boolean> = {
  sku: 'ARRI-ALEXA35-GOLD',
  model: 'ARRI Alexa 35',
  category_slug: 'cameras',
  brand_slug: 'arri',
  condition: 'Cinema Grade',
  quantityTotal: 1,
  quantityAvailable: 1,
  dailyPrice: '',
  weeklyPrice: '',
  monthlyPrice: '',
  purchasePrice: '',
  depositAmount: '',
  requiresDeposit: '',
  featured: true,
  isActive: true,
  requiresAssistant: true,
  budgetTier: 'Elite',
  warehouseLocation: '',
  barcode: '',
  tags: 'arri, alexa-35, cinema-camera, super-35, 4.6k, arriraw, elite-cinema, netflix-approved, 17-stops',
  boxContents: '1x Alexa 35 Camera Body, 1x ARRI LPL Mount, 1x PL to LPL Adapter, 1x MVF-2 Viewfinder, 1x Viewfinder Cable, 1x CCH-5 Top Handle, 1x Power Cable (Straight), 2x 2TB Codex Compact Drives, 1x Codex Compact Drive Reader, 1x Production Support Set (Side Brackets/Top Plate), 1x Bridge Plate BP-8, 1x Heavy Duty Flight Case',
  bufferTime: 0,
  bufferTimeUnit: 'hours',
  featuredImageUrl: '',
  galleryImageUrls: '',
  videoUrl: '',
  name_ar: 'آري أليكسا 35 سينما',
  name_en: 'ARRI Alexa 35 Cinema Camera',
  name_zh: '阿莱 Alexa 35 电影机',
  description_ar: 'آري أليكسا 35 ليست مجرد كاميرا، بل هي قمة التكنولوجيا في التصوير السينمائي الرقمي. بفضل مستشعر ALEV 4 الجديد كلياً، توفر هذه الكاميرا 17 وقفة من النطاق الديناميكي، وهو ما يتجاوز أي كاميرا سينمائية أخرى. تمنحك ألوان بشرة وتفاصيل بصرية بلمسة "عضوية" تشبه اللوحات الفنية، مما جعلها الخيار الأول لأضخم أفلام هوليوود والإعلانات العالمية الفاخرة.',
  description_en: 'The ARRI Alexa 35 is not just a camera; it is the pinnacle of digital cinematography. Featuring the all-new ALEV 4 sensor, it offers a staggering 17 stops of dynamic range—more than any other digital cinema camera in existence. It renders textures and skin tones with a painterly organic quality that has become the definitive \'ARRI Look\' for Hollywood blockbusters and high-end fashion films.',
  description_zh: 'ARRI Alexa 35 不仅仅是一款摄像机；它是数字电影摄影的巅峰。它采用全新的 ALEV 4 传感器，提供惊人的 17 档动态范围——超过现有的任何其他数字电影摄影机。它以如画般有机的质感呈现纹理和肤色，这已成为好莱坞大片和高端时尚电影的决定性"ARRI 外观"。',
  shortDescription_ar: '',
  shortDescription_en: '',
  shortDescription_zh: '',
  longDescription_ar: 'آري أليكسا 35 ليست مجرد كاميرا، بل هي قمة التكنولوجيا في التصوير السينمائي الرقمي. بفضل مستشعر ALEV 4 الجديد كلياً، توفر هذه الكاميرا 17 وقفة من النطاق الديناميكي، وهو ما يتجاوز أي كاميرا سينمائية أخرى. تمنحك ألوان بشرة وتفاصيل بصرية بلمسة "عضوية" تشبه اللوحات الفنية، مما جعلها الخيار الأول لأضخم أفلام هوليوود والإعلانات العالمية الفاخرة.',
  longDescription_en: 'The ARRI Alexa 35 is not just a camera; it is the pinnacle of digital cinematography. Featuring the all-new ALEV 4 sensor, it offers a staggering 17 stops of dynamic range—more than any other digital cinema camera in existence. It renders textures and skin tones with a painterly organic quality that has become the definitive \'ARRI Look\' for Hollywood blockbusters and high-end fashion films.',
  longDescription_zh: 'ARRI Alexa 35 不仅仅是一款摄像机；它是数字电影摄影的巅峰。它采用全新的 ALEV 4 传感器，提供惊人的 17 档动态范围——超过现有的任何其他数字电影摄影机。它以如画般有机的质感呈现纹理和肤色，这已成为好莱坞大片和高端时尚电影的决定性"ARRI 外观"。',
  seoTitle_ar: 'استئجار كاميرا آري أليكسا 35 سينما',
  seoTitle_en: 'Rent ARRI Alexa 35 Cinema Camera',
  seoTitle_zh: '租赁 阿莱 Alexa 35 电影机',
  seoDescription_ar: '',
  seoDescription_en: 'Rent the industry-leading ARRI Alexa 35. Featuring the new ALEV 4 sensor, REVEAL Color Science, and 17 stops of dynamic range. The gold standard for feature films, commercials, and elite cinematography. Available with PL or LPL mount.',
  seoDescription_zh: '',
  seoKeywords_ar: '',
  seoKeywords_en: 'ARRI Alexa 35 rental, digital cinema camera, 17 stops dynamic range, ALEV 4 sensor, Hollywood camera rental, high-end film equipment, Netflix approved camera, cinema hire',
  seoKeywords_zh: '',
  specifications_notes: `1. SHORT SPECS

- 4.6K Super 35 ALEV 4 CMOS sensor with 17 stops of dynamic range.
- ARRIRAW and Apple ProRes internal recording up to 120 fps.
- REVEAL Color Science for exceptional skin tones and highlight roll-off.
- Integrated electronic ND filters (0.6, 1.2, 1.8) and ARRI Textures.
- Industry-standard B-Mount power interface (24V native).

2. FULL SPECS

sensor_size: Super 35mm (27.99 × 19.22 mm)
sensor_type: ALEV 4 CMOS with Bayer Pattern
resolution: 4608 × 3164 (4.6K)
max_video_resolution: 4.6K (4608 × 3164) up to 75 fps
max_framerate: 120 fps (4K UHD) / 100 fps (4.6K 16:9)
codec: ARRIRAW / Apple ProRes (4444 XQ, 4444, 422 HQ)
log_gamma: LogC4
dynamic_range_stops: 17 stops
base_iso: 160 to 6400 (Enhanced Sensitivity Mode)
color_science: REVEAL Color Science
mount_type: ARRI LPL Mount (PL Adapter included)
weight_kg: 2.9 kg (body only)
dimensions_cm: 14.7 × 15.3 × 20.3 cm
media_type: Codex Compact Drive (1TB or 2TB)
hdmi_output: No (SDI only)
sdi_output: 2× 12G-SDI (Up to 4K60p 4:2:2 10-bit)
audio_inputs: 1× 5-pin LEMO (2-channel Line/Mic)
battery_type: B-Mount (20.5V to 33.6V)

3. TECHNICIAN SPECS

sensor_size: 27.99 × 19.22 mm (33.96 mm diagonal)
effective_pixels: 4608 × 3164
max_video_resolution: 4.6K 3:2 Open Gate up to 75 fps
max_framerate_4k: 120 fps (S35 4K 16:9)
internal_codec: ARRIRAW (.arx), ProRes (.mxf)
color_science: REVEAL (LogC4, AWG4, LogC4 LUTs)
rolling_shutter: < 8ms (Ultra-low)
flange_distance: 44.00 mm (LPL) / 52.00 mm (PL)
sdi_version: 12G-SDI (SMPTE ST2082-10)
timecode_io: 5-pin LEMO (LTC In/Out)
power_draw_watts: ~90 W (Body + MVF-2)
operating_temp: -20 °C to 45 °C`,
}

const SONY_A7R_V: Record<string, string | number | boolean> = {
  sku: 'SONY-A7RV-BODY',
  model: 'Sony A7R V (A7R5)',
  category_slug: 'cameras',
  brand_slug: 'sony',
  condition: 'Professional Grade',
  quantityTotal: 1,
  quantityAvailable: 1,
  dailyPrice: 400,
  weeklyPrice: 1600,
  monthlyPrice: 4800,
  purchasePrice: '',
  depositAmount: '',
  requiresDeposit: '',
  featured: true,
  isActive: true,
  requiresAssistant: false,
  budgetTier: 'Professional',
  warehouseLocation: '',
  barcode: '',
  tags: 'sony, a7rv, 61mp, high-resolution, mirrorless, 8k-video, photography, ai-autofocus, full-frame',
  boxContents: '1x Sony A7R V Body, 1x Body Cap, 2x Sony NP-FZ100 Batteries, 1x Sony BC-QZ1 Charger, 1x 160GB CFexpress Type A Card, 1x Card Reader, 1x USB-C Cable, 1x Neck Strap, 1x HDMI Cable Protector, 1x Padded Carry Case',
  bufferTime: 0,
  bufferTimeUnit: 'hours',
  featuredImageUrl: '',
  galleryImageUrls: '',
  videoUrl: '',
  name_ar: 'سوني A7R V ميرورليس',
  name_en: 'Sony A7R V Mirrorless Camera',
  name_zh: '索尼 A7R V 无反相机',
  description_ar: 'سوني A7R V تعيد تعريف التصوير عالي الدقة من خلال دمج مستشعر جبار بدقة 61 ميجابكسل مع وحدة معالجة مخصصة للذكاء الاصطناعي. إنها الأداة المثالية لمصوري الإعلانات وصناع الأفلام الذين يطلبون أدق التفاصيل المجهرية. سواء كنت تصور لوحات إعلانية ضخمة أو فيديو بدقة 8K، توفر هذه الكاميرا دقة لا تضاهى، ونظام تثبيت بـ 8 وقفات، وتركيزاً بؤرياً يتنبأ بحركة البشر.',
  description_en: 'The Sony A7R V redefines high-resolution imaging by combining a massive 61MP sensor with a dedicated AI processing unit. This is the ultimate tool for commercial photographers and filmmakers who demand microscopic detail. Whether you are shooting large-scale billboards or cropped 8K video, the A7R V offers unparalleled precision, 8-stop stabilization, and an autofocus system that predicts human movement.',
  description_zh: '索尼 A7R V 通过将巨大的 61MP 传感器与专用 AI 处理单元相结合，重新定义了高分辨率成像。这是要求微观细节的商业摄影师和电影制作人的终极工具。无论您是拍摄大型广告牌还是裁剪后的 8K 视频，A7R V 都能提供无与伦比的精度、8 档防抖以及能够预测人体动作的自动对焦系统。',
  shortDescription_ar: '',
  shortDescription_en: '',
  shortDescription_zh: '',
  longDescription_ar: 'سوني A7R V تعيد تعريف التصوير عالي الدقة من خلال دمج مستشعر جبار بدقة 61 ميجابكسل مع وحدة معالجة مخصصة للذكاء الاصطناعي. إنها الأداة المثالية لمصوري الإعلانات وصناع الأفلام الذين يطلبون أدق التفاصيل المجهرية. سواء كنت تصور لوحات إعلانية ضخمة أو فيديو بدقة 8K، توفر هذه الكاميرا دقة لا تضاهى، ونظام تثبيت بـ 8 وقفات، وتركيزاً بؤرياً يتنبأ بحركة البشر.',
  longDescription_en: 'The Sony A7R V redefines high-resolution imaging by combining a massive 61MP sensor with a dedicated AI processing unit. This is the ultimate tool for commercial photographers and filmmakers who demand microscopic detail. Whether you are shooting large-scale billboards or cropped 8K video, the A7R V offers unparalleled precision, 8-stop stabilization, and an autofocus system that predicts human movement.',
  longDescription_zh: '索尼 A7R V 通过将巨大的 61MP 传感器与专用 AI 处理单元相结合，重新定义了高分辨率成像。这是要求微观细节的商业摄影师和电影制作人的终极工具。无论您是拍摄大型广告牌还是裁剪后的 8K 视频，A7R V 都能提供无与伦比的精度、8 档防抖以及能够预测人体动作的自动对焦系统。',
  seoTitle_ar: 'استئجار سوني A7R V كاميرا 61 ميجابكسل',
  seoTitle_en: 'Rent Sony A7R V | 61MP 8K Mirrorless Camera',
  seoTitle_zh: '租赁索尼 A7R V 61MP 无反相机',
  seoDescription_ar: '',
  seoDescription_en: 'Professional Sony A7R V rental featuring 61MP resolution, AI-driven Real-time Tracking AF, 8K 24p recording, and 8-stop IBIS. Perfect for fashion, products, and high-res commercial photography.',
  seoDescription_zh: '',
  seoKeywords_ar: '',
  seoKeywords_en: 'Sony A7R V rental, 61MP camera hire, Sony A7R5 mirrorless, 8K video camera rental, commercial photography gear, AI autofocus camera, professional Sony rental',
  seoKeywords_zh: '',
  specifications_notes: `1. SHORT SPECS

- 61 MP Full-frame Exmor R BSI sensor with dedicated AI Processing Unit.
- 8K 24p / 4K 60p 10-bit 4:2:2 internal recording.
- AI-based Real-time Tracking AF (Human, Animal, Bird, Insect, Car, Train, Plane).
- 8-stop 5-axis in-body image stabilization (IBIS).
- 4-axis multi-angle 3.2-inch touchscreen LCD.

2. FULL SPECS

sensor_size: Full frame 35.8 × 23.8 mm
sensor_type: Exmor R BSI CMOS, 61.0 MP effective
resolution: 9504 × 6336 (Stills) / 7680 × 4320 (8K)
max_video_resolution: 7680 × 4320 (8K UHD) up to 25p
max_framerate: 60 fps (4K) / 120 fps (1080p)
codec: XAVC HS (8K/4K) / XAVC S-I (All-I 10-bit)
log_gamma: S-Log3, S-Cinetone, HLG
dynamic_range_stops: 15 stops (S-Log3)
base_iso: 100 to 32,000 (Expandable 50 to 102,400)
mount_type: Sony E-mount
weight_kg: 0.72 kg (body + battery + card)
dimensions_cm: 13.1 × 9.7 × 8.2 cm
media_type: Dual slots: CFexpress Type A / SD UHS-II
hdmi_output: 1× HDMI Type A (Full size)
audio_inputs: 3.5 mm Mic, Multi-interface Shoe (XLR via adapter)
battery_type: NP-FZ100 (7.2V / 16.4 Wh)
weather_sealed: Yes (Dust/Moisture resistant)

3. TECHNICIAN SPECS

effective_pixels: 61.0 MP
max_video_resolution: 8K (1.2x crop) 24/25p; 4K (Full-frame/S35) 24/25/30/50/60p
max_framerate_1080p: 120 fps
external_codec: 16-bit RAW via HDMI (compatible with Atomos)
af_system: 693-point Phase-detection with AI-human pose estimation
image_stabilization: 8.0 stops (CIPA standard)
viewfinder: 9.44M-dot QXGA OLED (0.90x magnification)
flange_distance: 18.00 mm
hdmi_version: HDMI 2.1
usb_port: USB-C 3.2 Gen 2 (10 Gbps) with Power Delivery
power_draw_watts: ~4.5 W (Stills) / ~6.6 W (Video record)
operating_temp: 0 °C to 40 °C`,
}

function rowFromRecord(record: Record<string, string | number | boolean>): (string | number)[] {
  return TEMPLATE_COLS.map((col) => {
    const v = record[col]
    if (v === undefined || v === null) return ''
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
    return v
  })
}

async function main() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(XLSX_PATH)

  const cameraSheet = workbook.getWorksheet('Camera ') ?? workbook.getWorksheet('Camera')
  if (!cameraSheet) {
    console.error('Camera sheet not found')
    process.exit(1)
  }

  const rows = cameraSheet.getRows(2, 500) ?? []
  let sonyRowIndex: number | null = null
  for (let i = 0; i < rows.length; i++) {
    const model = String(rows[i].getCell(2).value ?? '').trim().toLowerCase()
    if (model === 'sony a7r5' || model.includes('a7r v') || model.includes('a7rv')) {
      sonyRowIndex = i + 2
      break
    }
  }

  if (sonyRowIndex != null) {
    const row = cameraSheet.getRow(sonyRowIndex)
    const vals = rowFromRecord(SONY_A7R_V)
    TEMPLATE_COLS.forEach((_, idx) => row.getCell(idx + 1).value = vals[idx])
    console.log('Updated row', sonyRowIndex, '→ Sony A7R V (A7R5)')
  } else {
    console.log('Sony A7R5 row not found; appending Sony A7R V as new row')
    const newRow = cameraSheet.addRow(rowFromRecord(SONY_A7R_V))
    newRow.commit()
  }

  const hasArri = rows.some((r) => String(r.getCell(2).value ?? '').toLowerCase().includes('arri alexa 35'))
  if (!hasArri) {
    cameraSheet.insertRow(2, rowFromRecord(ARRI_ALEXA_35))
    console.log('Inserted row 2 → ARRI Alexa 35')
  } else {
    const arriIdx = rows.findIndex((r) => String(r.getCell(2).value ?? '').toLowerCase().includes('arri alexa 35'))
    if (arriIdx >= 0) {
      const row = cameraSheet.getRow(arriIdx + 2)
      const vals = rowFromRecord(ARRI_ALEXA_35)
      TEMPLATE_COLS.forEach((_, idx) => row.getCell(idx + 1).value = vals[idx])
      console.log('Updated ARRI Alexa 35 row')
    }
  }

  await workbook.xlsx.writeFile(XLSX_PATH)
  console.log('Saved:', XLSX_PATH)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
