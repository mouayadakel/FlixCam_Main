/**
 * Semantic & Contextual Search Utils
 * Provides Arabic text normalization, diacritic stripping, and cross-language brand/category term expansion.
 */

// Arabic character normalizations
function normalizeArabic(text: string): string {
  return text
    // Strip Tashkeel (diacritics)
    .replace(/[\u064B-\u0652]/g, '')
    // Normalize Alef shapes (أ، إ، آ -> ا)
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    // Normalize Teh Marbuta to Heh (ة -> ه)
    .replace(/\u0629/g, '\u0647')
    // Normalize Yeh/Alef Maksura (ى -> ي)
    .replace(/\u0649/g, '\u064A')
    .trim()
}

// Cross-language semantic mappings dictionary
const SEMANTIC_DICTIONARY: Record<string, string[]> = {
  // Brands
  sony: ['سوني', 'سونيي'],
  سوني: ['sony'],
  canon: ['كانون', 'قانون'],
  كانون: ['canon'],
  nikon: ['نيكون'],
  نيكون: ['nikon'],
  red: ['ريد', 'كاميرا ريد', 'احمر'],
  ريد: ['red'],
  arri: ['آري', 'اري'],
  اري: ['arri', 'آري'],
  آري: ['arri', 'اري'],
  blackmagic: ['بلاك ماجيك', 'بلاك ماجك', 'بلاك ماجق', 'بلاكماجيك', 'bmcc', 'bmpcc'],
  'بلاك ماجيك': ['blackmagic', 'bmpcc'],
  'بلاك ماجك': ['blackmagic'],
  dji: ['دي جي اي', 'دي جي آي', 'درون', 'رونين', 'ronin'],
  'دي جي اي': ['dji'],
  'دي جي آي': ['dji'],
  godox: ['جودوكس', 'قودوكس', 'فلاش', 'فلاشات'],
  جودوكس: ['godox'],
  قودوكس: ['godox'],
  aputure: ['أبوتشر', 'ابوتشر', 'اضاءة', 'اضاءه'],
  ابوتشر: ['aputure', 'أبوتشر'],
  أبوتشر: ['aputure', 'ابوتشر'],
  rode: ['رود', 'مايك', 'ميكروفون'],
  رود: ['rode'],
  shure: ['شور', 'مايك', 'ميكروفون'],
  شور: ['shure'],
  sennheiser: ['سنهايزر', 'سيزر', 'مايك'],
  سنهايزر: ['sennheiser'],
  sigma: ['سيجما', 'سيقما', 'عدسة', 'عدسات'],
  سيجما: ['sigma', 'سيقما'],
  سيقما: ['sigma', 'سيجما'],
  tamron: ['تامرون', 'عدسة', 'عدسات'],
  تامرون: ['tamron'],
  nanlite: ['نانلايت', 'اضاءة', 'لايت'],
  نانلايت: ['nanlite'],

  // Common Categories / Equipments
  camera: ['كاميرا', 'كاميرات', 'كيمرا', 'تصوير'],
  cameras: ['كاميرا', 'كاميرات', 'كيمرا', 'تصوير'],
  كاميرا: ['camera', 'cameras', 'كيمرا'],
  كاميرات: ['camera', 'cameras', 'كيمرا'],
  كيمرا: ['camera', 'cameras', 'كاميرا'],
  lens: ['عدسة', 'عدسات', 'لينز', 'لينس'],
  lenses: ['عدسة', 'عدسات', 'لينز', 'لينس'],
  عدسة: ['lens', 'lenses', 'لينز'],
  عدسات: ['lens', 'lenses', 'لينز'],
  mic: ['مايك', 'ميكروفون', 'صوت', 'لاسلكي'],
  microphone: ['مايك', 'ميكروفون', 'صوت', 'لاسلكي'],
  microphones: ['مايك', 'ميكروفون', 'صوت', 'لاسلكي'],
  مايك: ['mic', 'microphone', 'ميكروفون'],
  ميكروفون: ['mic', 'microphone', 'مايك'],
  light: ['إضاءة', 'اضاءة', 'ضوء', 'لايت', 'كشاف'],
  lighting: ['إضاءة', 'اضاءة', 'ضوء', 'لايت', 'كشاف'],
  lights: ['إضاءة', 'اضاءة', 'ضوء', 'لايت', 'كشاف'],
  اضاءة: ['light', 'lighting', 'لايت', 'إضاءة'],
  إضاءة: ['light', 'lighting', 'لايت', 'اضاءة'],
  لايت: ['light', 'lighting', 'اضاءة', 'إضاءة'],
  tripod: ['ترايبود', 'حامل', 'قاعدة', 'ستاند'],
  ترايبود: ['tripod', 'حامل'],
  حامل: ['tripod', 'gimbal', 'ستاند'],
  gimbal: ['جيمبال', 'مانع اهتزاز', 'مثبت', 'رونين', 'ronin'],
  جيمبال: ['gimbal', 'مثبت'],
  مثبت: ['gimbal', 'tripod'],
  battery: ['بطارية', 'بطاريات', 'باور'],
  batteries: ['بطارية', 'بطاريات'],
  بطارية: ['battery', 'batteries'],
  بطاريات: ['battery', 'batteries'],
  monitor: ['شاشة', 'مونيتور', 'شاشه'],
  شاشة: ['monitor', 'شاشه'],
  شاشه: ['monitor', 'شاشة'],
  drone: ['درون', 'طيارة', 'طائرة', 'dji'],
  درون: ['drone', 'dji'],
  filter: ['فلتر', 'فلاتر', 'عدسة'],
  filters: ['فلتر', 'فلاتر'],
  فلتر: ['filter', 'filters'],
  فلاتر: ['filter', 'filters'],
  wireless: ['وايرلس', 'لاسلكي', 'مايك'],
  وايرلس: ['wireless', 'لاسلكي'],
  لاسلكي: ['wireless', 'وايرلس'],
  audio: ['صوت', 'اوديو', 'مايك', 'ميكروفون'],
  sound: ['صوت', 'ساوند', 'مايك'],
  صوت: ['audio', 'sound', 'mic'],
}

/**
 * Expand a single text query into semantic search variations.
 * Returns an array of unique expanded keywords/phrases to search for.
 */
export function expandSearchQuery(query: string): string[] {
  if (!query) return []
  
  const rawTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const expandedTerms = new Set<string>()

  // Always include the raw query and normalized full query
  expandedTerms.add(query.toLowerCase())
  const normalizedFull = normalizeArabic(query.toLowerCase())
  if (normalizedFull !== query.toLowerCase()) {
    expandedTerms.add(normalizedFull)
  }

  rawTokens.forEach((token) => {
    // 1. Add raw token
    expandedTerms.add(token)

    // 2. Add normalized Arabic token
    const normalized = normalizeArabic(token)
    expandedTerms.add(normalized)

    // 3. Expand via Semantic Dictionary using both raw and normalized keys
    const rawMatches = SEMANTIC_DICTIONARY[token] || []
    const normMatches = SEMANTIC_DICTIONARY[normalized] || []
    
    rawMatches.forEach((match) => {
      expandedTerms.add(match)
      expandedTerms.add(normalizeArabic(match))
    })

    normMatches.forEach((match) => {
      expandedTerms.add(match)
      expandedTerms.add(normalizeArabic(match))
    })
  })

  return [...expandedTerms].map((t) => t.trim()).filter(Boolean)
}
