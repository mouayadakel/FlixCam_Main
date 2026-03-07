/**
 * Zod schemas for footer CMS payloads.
 */

import { z } from 'zod'

export const footerGeneralSchema = z.object({
  enabled: z.boolean().optional(),
  layout: z.enum(['default', 'minimal', 'extended']).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  linkColor: z.string().optional(),
  linkHoverColor: z.string().optional(),
  socialHoverEffect: z.enum(['lift', 'scale', 'glow', 'background']).optional(),
  socialHoverColor: z.string().nullable().optional(),
})

export const footerBrandSchema = z.object({
  logoLight: z.string(),
  logoDark: z.string(),
  companyNameAr: z.string().min(1),
  companyNameEn: z.string().min(1),
  descriptionAr: z.string(),
  descriptionEn: z.string(),
  showBrand: z.boolean().optional(),
})

export const footerContactSchema = z.object({
  type: z.enum(['phone', 'email', 'address']),
  labelAr: z.string(),
  labelEn: z.string(),
  value: z.string(),
  icon: z.string().nullable().optional(),
  whatsappEnabled: z.boolean().optional(),
  mapsLink: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
})

export const footerSocialLinkSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  displayNameAr: z.string().nullable().optional(),
  displayNameEn: z.string().nullable().optional(),
  customIcon: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
})

export const footerColumnSchema = z.object({
  titleAr: z.string(),
  titleEn: z.string(),
  showTitle: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
})

export const footerLinkSchema = z.object({
  textAr: z.string(),
  textEn: z.string(),
  linkType: z.enum(['internal', 'external', 'phone', 'email', 'file', 'category', 'page']),
  url: z.string(),
  icon: z.string().nullable().optional(),
  openNewTab: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
  pageSlug: z.string().nullable().optional(),
})

export const footerLegalLinkSchema = z.object({
  textAr: z.string(),
  textEn: z.string(),
  url: z.string(),
  order: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
})

export const footerLegalSchema = z.object({
  copyrightAr: z.string(),
  copyrightEn: z.string(),
  autoYear: z.boolean().optional(),
  layout: z.enum(['center', 'left', 'right']).optional(),
  links: z.array(footerLegalLinkSchema).optional(),
})

export const footerNewsletterSchema = z.object({
  enabled: z.boolean().optional(),
  titleAr: z.string(),
  titleEn: z.string(),
  descriptionAr: z.string(),
  descriptionEn: z.string(),
  placeholderAr: z.string(),
  placeholderEn: z.string(),
  buttonTextAr: z.string(),
  buttonTextEn: z.string(),
  successMessageAr: z.string(),
  successMessageEn: z.string(),
})

export type FooterGeneralInput = z.infer<typeof footerGeneralSchema>
export type FooterBrandInput = z.infer<typeof footerBrandSchema>
export type FooterContactInput = z.infer<typeof footerContactSchema>
export type FooterSocialLinkInput = z.infer<typeof footerSocialLinkSchema>
export type FooterColumnInput = z.infer<typeof footerColumnSchema>
export type FooterLinkInput = z.infer<typeof footerLinkSchema>
export type FooterLegalInput = z.infer<typeof footerLegalSchema>
export type FooterNewsletterInput = z.infer<typeof footerNewsletterSchema>
