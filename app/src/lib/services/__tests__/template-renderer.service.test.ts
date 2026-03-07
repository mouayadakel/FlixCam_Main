/**
 * Template renderer service tests
 */
import {
  renderTemplate,
  renderTemplateBody,
  renderString,
  TemplateRendererService,
} from '../template-renderer.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    notificationTemplate: { findUnique: jest.fn() },
  },
}))

const mockFindUnique = prisma.notificationTemplate.findUnique as jest.Mock

// Fixed date for deterministic assertions (2026-03-02 12:00:00 UTC)
const FIXED_DATE = new Date('2026-03-02T12:00:00.000Z')

describe('template-renderer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('renderTemplate', () => {
    it('returns null when template not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await renderTemplate('unknown', 'en', {})
      expect(result).toBeNull()
    })

    it('returns rendered subject and body when template exists', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'welcome',
        language: 'en',
        subject: 'Welcome {{name}}',
        bodyText: 'Hello {{name}}',
        bodyHtml: '<p>Hello {{name}}</p>',
        isActive: true,
      })
      const result = await renderTemplate('welcome', 'en', { name: 'Sarah' })
      expect(result).not.toBeNull()
      expect(result!.subject).toContain('Sarah')
      expect(result!.bodyText).toContain('Sarah')
      expect(result!.bodyHtml).toContain('Sarah')
    })

    it('returns bodyHtml null when template has no bodyHtml', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'sms-only',
        language: 'en',
        subject: 'Alert',
        bodyText: 'SMS content {{name}}',
        bodyHtml: null,
        isActive: true,
      })
      const result = await renderTemplate('sms-only', 'en', { name: 'User' })
      expect(result).not.toBeNull()
      expect(result!.subject).toBe('Alert')
      expect(result!.bodyText).toContain('User')
      expect(result!.bodyHtml).toBeNull()
    })

    it('returns bodyHtml null when template bodyHtml is empty string', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'text-only',
        language: 'en',
        subject: null,
        bodyText: 'Text only',
        bodyHtml: '',
        isActive: true,
      })
      const result = await renderTemplate('text-only', 'en', {})
      expect(result).not.toBeNull()
      expect(result!.bodyHtml).toBeNull()
    })

    it('uses language from template when provided', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'welcome',
        language: 'ar',
        subject: 'مرحبا',
        bodyText: '{{formatDate date}}',
        bodyHtml: null,
        isActive: true,
      })
      const result = await renderTemplate('welcome', 'ar', {
        date: FIXED_DATE,
      })
      expect(result).not.toBeNull()
      // ar-SA format includes Arabic text
      expect(result!.bodyText).toBeTruthy()
      expect(result!.bodyText.length).toBeGreaterThan(0)
    })

    it('uses slug_language composite key with language fallback to en', async () => {
      mockFindUnique.mockResolvedValue(null)
      await renderTemplate('test', '', {})
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          slug_language: { slug: 'test', language: 'en' },
          isActive: true,
        },
      })
    })

    it('uses template language when template found with empty language param', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'welcome',
        language: '',
        subject: 'Hi',
        bodyText: 'Hello',
        bodyHtml: null,
        isActive: true,
      })
      const result = await renderTemplate('welcome', '', {})
      expect(result).not.toBeNull()
    })

    it('returns subject null when template has no subject', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'no-subject',
        language: 'en',
        subject: null,
        bodyText: 'Body only',
        bodyHtml: null,
        isActive: true,
      })
      const result = await renderTemplate('no-subject', 'en', {})
      expect(result).not.toBeNull()
      expect(result!.subject).toBeNull()
    })
  })

  describe('renderTemplateBody', () => {
    it('returns bodyText when template exists', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'welcome',
        language: 'en',
        subject: 'Hi',
        bodyText: 'Hello {{name}}',
        bodyHtml: null,
        isActive: true,
      })
      const result = await renderTemplateBody('welcome', 'en', { name: 'Bob' })
      expect(result).toBe('Hello Bob')
    })

    it('returns null when template not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await renderTemplateBody('missing', 'en', {})
      expect(result).toBeNull()
    })
  })

  describe('renderString', () => {
    it('renders simple variable interpolation', () => {
      const result = renderString('Hello {{name}}', { name: 'World' })
      expect(result).toBe('Hello World')
    })

    it('uses default locale en when not provided', () => {
      const result = renderString('{{formatDate date}}', {
        date: FIXED_DATE,
      })
      // en-GB format: "Monday, 2 March 2026" or similar
      expect(result).toMatch(/Monday|March|2026/)
    })

    it('uses provided locale parameter', () => {
      const result = renderString('{{formatDate date}}', { date: FIXED_DATE }, 'ar')
      expect(result).toBeTruthy()
      expect(result.length).toBeGreaterThan(0)
    })

    it('renders formatDate helper with Date object', () => {
      const result = renderString('{{formatDate date}}', { date: FIXED_DATE })
      expect(result).toMatch(/2026/)
    })

    it('renders formatDate helper with date string', () => {
      const result = renderString('{{formatDate date}}', {
        date: '2026-03-02T12:00:00.000Z',
      })
      expect(result).toMatch(/2026/)
    })

    it('renders formatDate helper with null returns empty string', () => {
      const result = renderString('{{formatDate date}}', { date: null })
      expect(result).toBe('')
    })

    it('renders formatDateTime helper', () => {
      const result = renderString('{{formatDateTime date}}', { date: FIXED_DATE })
      expect(result).toMatch(/2026/)
    })

    it('renders formatDateTime helper with null returns empty string', () => {
      const result = renderString('{{formatDateTime date}}', { date: null })
      expect(result).toBe('')
    })

    it('renders formatDateTime helper with date string', () => {
      const result = renderString('{{formatDateTime date}}', {
        date: '2026-03-02T12:00:00.000Z',
      })
      expect(result).toMatch(/2026/)
    })

    it('renders formatCurrency helper with number', () => {
      const result = renderString('{{formatCurrency amount}}', { amount: 1000 })
      expect(result).toMatch(/1|0|SAR|ر\.س|٫|,/)
    })

    it('renders formatCurrency helper with null returns empty string', () => {
      const result = renderString('{{formatCurrency amount}}', { amount: null })
      expect(result).toBe('')
    })

    it('renders formatCurrency helper with empty string returns empty string', () => {
      const result = renderString('{{formatCurrency amount}}', { amount: '' })
      expect(result).toBe('')
    })

    it('renders formatCurrency helper with NaN returns string representation', () => {
      const result = renderString('{{formatCurrency amount}}', { amount: 'invalid' })
      expect(result).toBe('invalid')
    })
  })

  describe('TemplateRendererService', () => {
    it('render delegates to renderTemplate', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'welcome',
        language: 'en',
        subject: 'Hi',
        bodyText: 'Hello {{name}}',
        bodyHtml: null,
        isActive: true,
      })
      const result = await TemplateRendererService.render('welcome', 'en', {
        name: 'Alice',
      })
      expect(result).not.toBeNull()
      expect(result!.bodyText).toBe('Hello Alice')
    })

    it('renderBody delegates to renderTemplateBody', async () => {
      mockFindUnique.mockResolvedValue({
        slug: 'welcome',
        language: 'en',
        subject: 'Hi',
        bodyText: 'Body {{x}}',
        bodyHtml: null,
        isActive: true,
      })
      const result = await TemplateRendererService.renderBody('welcome', 'en', {
        x: 'Y',
      })
      expect(result).toBe('Body Y')
    })

    it('renderString delegates to renderString function', () => {
      const result = TemplateRendererService.renderString('{{a}}', { a: 'b' })
      expect(result).toBe('b')
    })
  })

  describe('Handlebars helpers', () => {
    describe('formatDate', () => {
      it('returns empty string for null', () => {
        const result = renderString('{{formatDate date}}', { date: null })
        expect(result).toBe('')
      })

      it('returns empty string for undefined', () => {
        const result = renderString('{{formatDate date}}', {})
        expect(result).toBe('')
      })

      it('returns empty string for undefined in formatDateTime', () => {
        const result = renderString('{{formatDateTime date}}', {})
        expect(result).toBe('')
      })

      it('formats Date object with locale en', () => {
        const result = renderString('{{formatDate date}}', {
          date: FIXED_DATE,
          locale: 'en',
        })
        expect(result).toMatch(/Monday|March|2|2026/)
      })

      it('formats Date object with locale ar', () => {
        const result = renderString('{{formatDate date}}', {
          date: FIXED_DATE,
          locale: 'ar',
        })
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
      })

      it('formats date string', () => {
        const result = renderString('{{formatDate date}}', {
          date: '2026-03-02',
          locale: 'en',
        })
        expect(result).toMatch(/2026/)
      })
    })

    describe('formatDateTime', () => {
      it('returns empty string for null', () => {
        const result = renderString('{{formatDateTime date}}', { date: null })
        expect(result).toBe('')
      })

      it('formats Date with locale en', () => {
        const result = renderString('{{formatDateTime date}}', {
          date: FIXED_DATE,
          locale: 'en',
        })
        expect(result).toMatch(/2026/)
      })

      it('formats Date with locale ar', () => {
        const result = renderString('{{formatDateTime date}}', {
          date: FIXED_DATE,
          locale: 'ar',
        })
        expect(result).toBeTruthy()
      })
    })

    describe('formatCurrency', () => {
      it('returns empty string for null', () => {
        const result = renderString('{{formatCurrency val}}', { val: null })
        expect(result).toBe('')
      })

      it('returns empty string for empty string', () => {
        const result = renderString('{{formatCurrency val}}', { val: '' })
        expect(result).toBe('')
      })

      it('formats number with locale en', () => {
        const result = renderString('{{formatCurrency val}}', {
          val: 1234.56,
          locale: 'en',
        })
        expect(result).toBeTruthy()
        expect(result).toMatch(/1|2|3|4|5|6|SAR|ر\.س|٫|,/)
      })

      it('formats number with locale ar', () => {
        const result = renderString('{{formatCurrency val}}', {
          val: 500,
          locale: 'ar',
        })
        expect(result).toBeTruthy()
      })

    it('returns string representation for NaN', () => {
      const result = renderString('{{formatCurrency val}}', { val: 'xyz' })
      expect(result).toBe('xyz')
    })

    it('formats numeric string via parseFloat', () => {
      const result = renderString('{{formatCurrency val}}', {
        val: '2500.50',
        locale: 'en',
      })
      expect(result).toBeTruthy()
      expect(result).toMatch(/2|5|0|SAR|ر\.س|٫|,/)
    })
    })

    describe('eq', () => {
      it('returns truthy when values are equal', () => {
        const result = renderString('{{#if (eq a b)}}yes{{else}}no{{/if}}', {
          a: 1,
          b: 1,
        })
        expect(result).toBe('yes')
      })

      it('returns falsy when values are not equal', () => {
        const result = renderString('{{#if (eq a b)}}yes{{else}}no{{/if}}', {
          a: 1,
          b: 2,
        })
        expect(result).toBe('no')
      })
    })

    describe('neq', () => {
      it('returns truthy when values are not equal', () => {
        const result = renderString('{{#if (neq a b)}}yes{{else}}no{{/if}}', {
          a: 1,
          b: 2,
        })
        expect(result).toBe('yes')
      })

      it('returns falsy when values are equal', () => {
        const result = renderString('{{#if (neq a b)}}yes{{else}}no{{/if}}', {
          a: 1,
          b: 1,
        })
        expect(result).toBe('no')
      })
    })

    describe('not', () => {
      it('returns truthy for falsy value', () => {
        const result = renderString('{{#if (not x)}}yes{{else}}no{{/if}}', {
          x: false,
        })
        expect(result).toBe('yes')
      })

      it('returns falsy for truthy value', () => {
        const result = renderString('{{#if (not x)}}yes{{else}}no{{/if}}', {
          x: true,
        })
        expect(result).toBe('no')
      })
    })

    describe('and', () => {
      it('renders fn block when all args are truthy', () => {
        const result = renderString('{{#and a b}}yes{{else}}no{{/and}}', {
          a: 1,
          b: 'x',
        })
        expect(result).toBe('yes')
      })

      it('renders inverse block when any arg is falsy', () => {
        const result = renderString('{{#and a b}}yes{{else}}no{{/and}}', {
          a: 0,
          b: 'x',
        })
        expect(result).toBe('no')
      })

      it('renders inverse when second arg is falsy', () => {
        const result = renderString('{{#and a b}}yes{{else}}no{{/and}}', {
          a: 1,
          b: '',
        })
        expect(result).toBe('no')
      })
    })

    describe('or', () => {
      it('renders fn block when any arg is truthy', () => {
        const result = renderString('{{#or a b}}yes{{else}}no{{/or}}', {
          a: 0,
          b: 'x',
        })
        expect(result).toBe('yes')
      })

      it('renders inverse block when all args are falsy', () => {
        const result = renderString('{{#or a b}}yes{{else}}no{{/or}}', {
          a: 0,
          b: '',
        })
        expect(result).toBe('no')
      })

      it('renders fn when first arg is truthy', () => {
        const result = renderString('{{#or a b}}yes{{else}}no{{/or}}', {
          a: 1,
          b: 0,
        })
        expect(result).toBe('yes')
      })
    })
  })

  describe('getLocale fallback', () => {
    it('uses fallback en when locale is undefined in context', () => {
      // When locale is explicitly undefined, getLocale falls back to 'en'
      const result = renderString('{{formatDate date}}', {
        date: FIXED_DATE,
        locale: undefined,
      })
      // Should still produce valid output (en-GB format)
      expect(result).toMatch(/2026/)
    })
  })
})
