/**
 * @file template-renderer.service.ts
 * @description Renders notification templates with variable interpolation and locale-aware formatting.
 * @module lib/services/template-renderer
 */

import Handlebars from 'handlebars'
import { prisma } from '@/lib/db/prisma'

const CURRENCY_CODE = 'SAR'

function getLocale(options: Handlebars.HelperOptions): string {
  const root = options.data?.root as { locale?: string } | undefined
  return root?.locale ?? 'en'
}

function registerHelpers() {
  Handlebars.registerHelper('formatDate', (date: unknown, options: Handlebars.HelperOptions) => {
    if (date == null) return ''
    const locale = getLocale(options)
    const d = date instanceof Date ? date : new Date(String(date))
    return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  })

  Handlebars.registerHelper('formatDateTime', (date: unknown, options: Handlebars.HelperOptions) => {
    if (date == null) return ''
    const locale = getLocale(options)
    const d = date instanceof Date ? date : new Date(String(date))
    return d.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  })

  Handlebars.registerHelper('formatCurrency', (value: unknown, options: Handlebars.HelperOptions) => {
    if (value == null || value === '') return ''
    const locale = getLocale(options)
    const num = typeof value === 'number' ? value : parseFloat(String(value))
    if (Number.isNaN(num)) return String(value)
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      style: 'currency',
      currency: CURRENCY_CODE,
    }).format(num)
  })

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)
  Handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b)
  Handlebars.registerHelper('not', (v: unknown) => !v)
  Handlebars.registerHelper('and', function (this: unknown, ...args: unknown[]) {
    const options = args.pop() as Handlebars.HelperOptions
    return args.every(Boolean) ? options.fn(this) : options.inverse(this)
  })
  Handlebars.registerHelper('or', function (this: unknown, ...args: unknown[]) {
    const options = args.pop() as Handlebars.HelperOptions
    return args.some(Boolean) ? options.fn(this) : options.inverse(this)
  })
}

let helpersRegistered = false
function ensureHelpers() {
  if (!helpersRegistered) {
    registerHelpers()
    helpersRegistered = true
  }
}

export interface RenderResult {
  subject: string | null
  bodyText: string
  bodyHtml: string | null
}

/**
 * Render a template by slug and language with given data.
 * Loads template from DB and compiles with Handlebars.
 */
export async function renderTemplate(
  slug: string,
  language: string,
  data: Record<string, unknown>
): Promise<RenderResult | null> {
  const template = await prisma.notificationTemplate.findUnique({
    where: {
      slug_language: { slug, language: language || 'en' },
      isActive: true,
    },
  })

  if (!template) return null

  const lang = (template.language || language || 'en').toLowerCase()
  ensureHelpers()

  const ctx = { ...data, locale: lang }

  const subject = template.subject
    ? Handlebars.compile(template.subject)(ctx)
    : null
  const bodyText = Handlebars.compile(template.bodyText)(ctx)
  const bodyHtml = template.bodyHtml
    ? Handlebars.compile(template.bodyHtml)(ctx)
    : null

  return { subject, bodyText, bodyHtml }
}

/**
 * Render template body only (for SMS/WhatsApp text). Returns plain text string.
 */
export async function renderTemplateBody(
  slug: string,
  language: string,
  data: Record<string, unknown>
): Promise<string | null> {
  const result = await renderTemplate(slug, language, data)
  return result?.bodyText ?? null
}

/**
 * Render inline string with Handlebars (e.g. when template is not from DB).
 */
export function renderString(
  templateString: string,
  data: Record<string, unknown>,
  locale = 'en'
): string {
  ensureHelpers()
  const ctx = { ...data, locale }
  return Handlebars.compile(templateString)(ctx)
}

export const TemplateRendererService = {
  render: renderTemplate,
  renderBody: renderTemplateBody,
  renderString,
}
