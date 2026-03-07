/**
 * Contextual prompt templates for AI content generation (short/long description, SEO, translation).
 * Category-aware, locale-aware prompts for FlixCam.rent cinema equipment.
 */

export interface ProductContext {
  name: string
  brand: string
  category: string
  subCategory?: string
  existingSpecs?: Record<string, unknown>
  boxContents?: string
  locale: 'en' | 'ar' | 'zh'
  existingTranslations?: Record<string, string>
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  Cameras:
    'cinema camera rental, film camera hire, digital cinema, 4K camera rental, production camera',
  Lenses: 'cinema lens rental, prime lens hire, zoom lens rental, anamorphic lens, PL mount',
  Lighting:
    'film lighting rental, LED panel hire, fresnel light, production lighting, studio light rental',
  Audio: 'production audio rental, wireless mic hire, boom mic, sound recording, lavalier rental',
  Grip: 'grip equipment rental, tripod hire, slider rental, dolly, gimbal stabilizer rental',
  Monitors:
    'field monitor rental, director monitor, video village, SDI monitor, production display rental',
}

export const PROMPT_TEMPLATES = {
  shortDescription: {
    system: `You are a product copywriter for a premium cinema equipment rental company in Saudi Arabia (FlixCam.rent). Write short, compelling product descriptions for film production professionals.`,
    user: (ctx: ProductContext) => `
Write a short description (50-80 words) for:
Product: ${ctx.name}
Brand: ${ctx.brand}
Category: ${ctx.category}${ctx.subCategory ? ` > ${ctx.subCategory}` : ''}
Key Specs: ${ctx.existingSpecs ? JSON.stringify(ctx.existingSpecs) : 'None available'}
Target Audience: Professional filmmakers, cinematographers, production companies in Saudi Arabia/Gulf

Requirements:
- Highlight 2-3 key features/benefits
- Mention primary use case
- Professional tone
- Do NOT include pricing
- Do NOT use superlatives like "best" or "amazing"
- Language: ${ctx.locale === 'ar' ? 'Arabic (formal Saudi/Gulf register, right-to-left)' : ctx.locale === 'zh' ? 'Simplified Chinese' : 'English (professional)'}

Return ONLY the description text, no quotes or labels.`,
  },

  longDescription: {
    system: `You are a senior product copywriter for FlixCam.rent, Saudi Arabia's premier cinema equipment rental platform. Write detailed, informative product descriptions that help film professionals make rental decisions.`,
    user: (ctx: ProductContext) => `
Write a detailed product description (200-400 words) for:
Product: ${ctx.name}
Brand: ${ctx.brand}
Category: ${ctx.category}${ctx.subCategory ? ` > ${ctx.subCategory}` : ''}
Key Specs: ${ctx.existingSpecs ? JSON.stringify(ctx.existingSpecs) : 'None available'}
Box Contents: ${ctx.boxContents ?? 'Not specified'}

Structure the description as:
1. Opening paragraph: What the product is and who it's for (2-3 sentences)
2. Key Features: 3-5 bullet points of standout features
3. Use Cases: 2-3 specific production scenarios where this excels
4. Technical Highlights: Brief mention of important specs

Requirements:
- Professional, authoritative tone
- Include relevant cinema/film production terminology
- Mention compatibility with common production setups
- Language: ${ctx.locale === 'ar' ? 'Arabic (formal Saudi/Gulf register)' : ctx.locale === 'zh' ? 'Simplified Chinese' : 'English'}
- Do NOT include pricing or rental terms
- Do NOT fabricate specs not provided

Return ONLY the description text.`,
  },

  seo: {
    system: `You are an SEO specialist for a cinema equipment rental platform (FlixCam.rent) serving Saudi Arabia and the Gulf region.`,
    user: (ctx: ProductContext) => `
Generate SEO metadata for:
Product: ${ctx.name}
Brand: ${ctx.brand}
Category: ${ctx.category}
Language: ${ctx.locale === 'ar' ? 'Arabic' : ctx.locale === 'zh' ? 'Chinese' : 'English'}

Category Keywords to Include: ${CATEGORY_KEYWORDS[ctx.category] ?? 'cinema equipment rental'}

Return JSON with:
{
  "seoTitle": "50-60 characters, includes brand + product type + 'rental' keyword",
  "seoDescription": "150-160 characters, keyword-rich, includes call-to-action",
  "seoKeywords": "8-12 comma-separated keywords relevant to this product and rental market"
}

Requirements:
- Include location relevance (Saudi Arabia, Riyadh, Dubai for English)
- Include rental-specific keywords (rent, hire, rental)
- Include brand name
- seoTitle must be different from product name`,
  },

  translation: {
    system: `You are a professional translator specializing in cinema and film production equipment. You maintain technical accuracy while adapting to local market conventions.`,
    user: (source: string, targetLocale: string) => `
Translate the following cinema equipment product content to ${targetLocale === 'ar' ? 'Arabic (formal Saudi/Gulf register, professional tone)' : targetLocale === 'zh' ? 'Simplified Chinese (mainland standard)' : 'English'}.

Rules:
- Keep technical terms (brand names, model numbers, specs) in their original form
- Adapt measurement units if appropriate (but keep standard cinema units)
- Maintain the same structure and formatting
- Do NOT add or remove information
- For Arabic: use formal register appropriate for business/professional context

Content to translate:
${source}

Return ONLY the translated text.`,
  },
}

export { CATEGORY_KEYWORDS }
