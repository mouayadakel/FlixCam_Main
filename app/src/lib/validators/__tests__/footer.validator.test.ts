/**
 * Unit tests for footer.validator
 */

import {
  footerGeneralSchema,
  footerBrandSchema,
  footerContactSchema,
  footerSocialLinkSchema,
  footerColumnSchema,
  footerLinkSchema,
  footerLegalSchema,
  footerNewsletterSchema,
} from '../footer.validator'

describe('footer.validator', () => {
  describe('footerGeneralSchema', () => {
    it('accepts valid general config', () => {
      const result = footerGeneralSchema.safeParse({
        enabled: true,
        layout: 'default',
        backgroundColor: '#000',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = footerGeneralSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('footerBrandSchema', () => {
    it('accepts valid brand', () => {
      const result = footerBrandSchema.safeParse({
        logoLight: '/logo-light.png',
        logoDark: '/logo-dark.png',
        companyNameAr: 'شركة',
        companyNameEn: 'Company',
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when companyNameEn empty', () => {
      const result = footerBrandSchema.safeParse({
        logoLight: '/logo-light.png',
        logoDark: '/logo-dark.png',
        companyNameAr: 'شركة',
        companyNameEn: '',
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('footerContactSchema', () => {
    it('accepts valid contact', () => {
      const result = footerContactSchema.safeParse({
        type: 'phone',
        labelAr: 'هاتف',
        labelEn: 'Phone',
        value: '+966501234567',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid type', () => {
      const result = footerContactSchema.safeParse({
        type: 'invalid',
        labelAr: 'هاتف',
        labelEn: 'Phone',
        value: '+966501234567',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('footerSocialLinkSchema', () => {
    it('accepts valid social link', () => {
      const result = footerSocialLinkSchema.safeParse({
        platform: 'twitter',
        url: 'https://twitter.com/example',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid url', () => {
      const result = footerSocialLinkSchema.safeParse({
        platform: 'twitter',
        url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('footerColumnSchema', () => {
    it('accepts valid column', () => {
      const result = footerColumnSchema.safeParse({
        titleAr: 'عنوان',
        titleEn: 'Title',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('footerLinkSchema', () => {
    it('accepts valid link', () => {
      const result = footerLinkSchema.safeParse({
        textAr: 'رابط',
        textEn: 'Link',
        linkType: 'external',
        url: 'https://example.com',
      })
      expect(result.success).toBe(true)
    })
    it('accepts internal link type', () => {
      const result = footerLinkSchema.safeParse({
        textAr: 'رابط',
        textEn: 'Link',
        linkType: 'internal',
        url: '/about',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('footerLegalSchema', () => {
    it('accepts valid legal', () => {
      const result = footerLegalSchema.safeParse({
        copyrightAr: '© 2026',
        copyrightEn: '© 2026',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('footerNewsletterSchema', () => {
    it('accepts valid newsletter', () => {
      const result = footerNewsletterSchema.safeParse({
        titleAr: 'النشرة',
        titleEn: 'Newsletter',
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
        placeholderAr: 'البريد',
        placeholderEn: 'Email',
        buttonTextAr: 'اشترك',
        buttonTextEn: 'Subscribe',
        successMessageAr: 'تم',
        successMessageEn: 'Success',
      })
      expect(result.success).toBe(true)
    })
  })
})
