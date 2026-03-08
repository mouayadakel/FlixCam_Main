/**
 * Blog AI service - Gemini-powered content generation for FlixCam blog.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { BLOG_SYSTEM_PROMPT } from '@/lib/ai/blog-prompts'

const GEMINI_MODEL = 'gemini-2.0-flash'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  return key
}

async function generate(prompt: string, systemPrompt: string = BLOG_SYSTEM_PROMPT, maxTokens = 4000): Promise<string> {
  const genAI = new GoogleGenerativeAI(getApiKey())
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  })
  const result = await model.generateContent(`${systemPrompt}\n\n---\n\n${prompt}`)
  return result.response.text().trim()
}

async function generateJson<T>(prompt: string, systemPrompt: string = BLOG_SYSTEM_PROMPT): Promise<T> {
  const text = await generate(
    `${prompt}\n\nRespond with valid JSON only. No markdown, no code blocks.`,
    systemPrompt,
    2000
  )
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned) as T
}

export const BlogAIService = {
  async generateOutline(title: string, language: 'ar' | 'en'): Promise<string> {
    const prompt = `Generate a blog post outline for: "${title}"
Language: ${language}
Output: Markdown with H2 and H3 headings. 4-6 main sections. Include intro and conclusion.`
    return generate(prompt, BLOG_SYSTEM_PROMPT, 1500)
  },

  async generateDraft(outline: string, title: string, language: 'ar' | 'en'): Promise<object> {
    const prompt = `Write a full blog post based on this outline. Title: "${title}"
Language: ${language}
Outline:
${outline}

Output: Valid Tiptap/ProseMirror JSON. Use doc > content array. Nodes: paragraph, heading (level 2/3), bulletList, orderedList, blockquote, image (with src, alt). Keep it 800-1200 words equivalent.`
    return generateJson<object>(prompt)
  },

  async rewrite(content: string, tone: 'professional' | 'casual' | 'technical', language: 'ar' | 'en'): Promise<string> {
    const prompt = `Rewrite this content in a ${tone} tone. Language: ${language}

Content:
${content.slice(0, 4000)}

Output: Rewritten text only.`
    return generate(prompt, BLOG_SYSTEM_PROMPT, 2000)
  },

  async translate(content: string, from: 'ar' | 'en', to: 'ar' | 'en'): Promise<string> {
    const prompt = `Translate from ${from} to ${to}. Preserve formatting (paragraphs, lists).

Content:
${content.slice(0, 4000)}

Output: Translated text only.`
    return generate(prompt, BLOG_SYSTEM_PROMPT, 2000)
  },

  async generateSeoMeta(
    title: string,
    content: string,
    language: 'ar' | 'en'
  ): Promise<{ metaTitle: string; metaDescription: string; keywords: string[]; focusKeyphrase: string }> {
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const prompt = `Generate SEO metadata for this blog post.
Title: ${title}
Content (excerpt): ${text.slice(0, 1500)}
Language: ${language}

Output JSON: { "metaTitle": string (max 60 chars), "metaDescription": string (max 160 chars), "keywords": string[] (5-8), "focusKeyphrase": string }`
    return generateJson(prompt)
  },

  async generateFaq(content: string, language: 'ar' | 'en'): Promise<Array<{ question: string; answer: string }>> {
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const prompt = `Extract or generate 3-6 FAQ items from this content. Language: ${language}
Content: ${text.slice(0, 3000)}

Output JSON: { "faq": [{ "question": string, "answer": string }] }`
    const result = await generateJson<{ faq: Array<{ question: string; answer: string }> }>(prompt)
    return result.faq ?? []
  },

  async extractEquipment(content: string): Promise<
    Array<{ name: string; confidence: number; category: string }>
  > {
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const prompt = `Extract camera/cinema equipment mentions from this content. Include brand + model.
Content: ${text.slice(0, 3000)}

Output JSON: { "equipment": [{ "name": string, "confidence": number (0-1), "category": string (e.g. camera, lens, lighting) }] }`
    const result = await generateJson<{ equipment: Array<{ name: string; confidence: number; category: string }> }>(
      prompt
    )
    return result.equipment ?? []
  },

  async generateAltText(imageUrl: string, context: string | undefined, language: 'ar' | 'en'): Promise<string> {
    const prompt = `Generate concise alt text for an image. Language: ${language}
Context: ${context ?? 'Blog post image'}
Image URL (for context): ${imageUrl}
Output: Single line, max 125 chars. Descriptive, inclusive.`
    return generate(prompt, BLOG_SYSTEM_PROMPT, 100)
  },

  async qualityScore(content: string): Promise<{ score: number; feedback: Array<{ issue: string; suggestion: string }> }> {
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const prompt = `Score this blog content 0-100. Provide 2-4 feedback items.
Content: ${text.slice(0, 3000)}

Output JSON: { "score": number, "feedback": [{ "issue": string, "suggestion": string }] }`
    return generateJson(prompt)
  },

  async seoScore(
    title: string,
    content: string,
    meta: { metaTitle?: string; metaDescription?: string; keywords?: string[] }
  ): Promise<{ score: number; issues: Array<{ severity: 'high' | 'medium' | 'low'; message: string }> }> {
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const prompt = `Score SEO for this blog post 0-100. Consider title, content, meta.
Title: ${title}
Meta: ${JSON.stringify(meta)}
Content excerpt: ${text.slice(0, 1500)}

Output JSON: { "score": number, "issues": [{ "severity": "high"|"medium"|"low", "message": string }] }`
    return generateJson(prompt)
  },

  async suggestLinks(content: string): Promise<
    Array<{ anchor: string; targetSlug: string; relevance: number }>
  > {
    const prompt = `Suggest 3-5 internal link opportunities. For each: anchor text (exact phrase in content), suggested target slug (e.g. camera-guides), relevance 0-1.
Content: ${(typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 3000)}

Output JSON: { "suggestions": [{ "anchor": string, "targetSlug": string, "relevance": number }] }`
    const result = await generateJson<{
      suggestions: Array<{ anchor: string; targetSlug: string; relevance: number }>
    }>(prompt)
    return result.suggestions ?? []
  },

  async relatedPosts(postId: string, content: string): Promise<
    Array<{ id: string; title: string; relevance: number }>
  > {
    const prompt = `Suggest 3-5 related blog post topics. For each: id (use "suggested-slug" as placeholder), title, relevance 0-1.
Content: ${(typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 2000)}

Output JSON: { "posts": [{ "id": string, "title": string, "relevance": number }] }`
    const result = await generateJson<{ posts: Array<{ id: string; title: string; relevance: number }> }>(prompt)
    return result.posts ?? []
  },

  async headlineOptimizer(title: string, language: 'ar' | 'en'): Promise<string[]> {
    const prompt = `Generate 5 alternative headlines for: "${title}"
Language: ${language}
Each 50-70 chars. Varied angles: benefit, curiosity, how-to, list, question.

Output JSON: { "headlines": string[] }`
    const result = await generateJson<{ headlines: string[] }>(prompt)
    return result.headlines ?? []
  },

  async autoTags(content: string): Promise<string[]> {
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const prompt = `Suggest 5-8 tags (lowercase, hyphenated) for this blog content.
Content: ${text.slice(0, 3000)}

Output JSON: { "tags": string[] }`
    const result = await generateJson<{ tags: string[] }>(prompt)
    return result.tags ?? []
  },
}
