'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Layout } from 'lucide-react'
import { FooterGeneralTab } from './_components/footer-general-tab'
import { FooterBrandTab } from './_components/footer-brand-tab'
import { FooterContactTab } from './_components/footer-contact-tab'
import { FooterSocialTab } from './_components/footer-social-tab'
import { FooterColumnsTab } from './_components/footer-columns-tab'
import { FooterLegalTab } from './_components/footer-legal-tab'
import { FooterNewsletterTab } from './_components/footer-newsletter-tab'
import { FooterIconsEffectsTab } from './_components/footer-icons-effects-tab'

export type FooterData = Awaited<ReturnType<typeof fetchFooter>>
async function fetchFooter() {
  const res = await fetch('/api/admin/cms/footer')
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    id: string
    enabled: boolean
    layout: string
    backgroundColor: string
    textColor: string
    linkColor: string
    linkHoverColor: string
    socialHoverEffect?: string
    socialHoverColor?: string | null
    brand: {
      id: string
      logoLight: string
      logoDark: string
      companyNameAr: string
      companyNameEn: string
      descriptionAr: string
      descriptionEn: string
      showBrand: boolean
    } | null
    contacts: Array<{
      id: string
      type: string
      labelAr: string
      labelEn: string
      value: string
      icon: string | null
      whatsappEnabled: boolean
      mapsLink: string | null
      order: number
      enabled: boolean
    }>
    socialLinks: Array<{
      id: string
      platform: string
      url: string
      displayNameAr: string | null
      displayNameEn: string | null
      customIcon: string | null
      order: number
      enabled: boolean
    }>
    columns: Array<{
      id: string
      titleAr: string
      titleEn: string
      showTitle: boolean
      order: number
      enabled: boolean
      links: Array<{
        id: string
        textAr: string
        textEn: string
        linkType: string
        url: string
        icon: string | null
        openNewTab: boolean
        order: number
        enabled: boolean
        categoryId: string | null
        pageSlug: string | null
      }>
    }>
    legal: {
      id: string
      copyrightAr: string
      copyrightEn: string
      autoYear: boolean
      layout: string
      links: Array<{
        id: string
        textAr: string
        textEn: string
        url: string
        order: number
        enabled: boolean
      }>
    } | null
    newsletter: {
      id: string
      enabled: boolean
      titleAr: string
      titleEn: string
      descriptionAr: string
      descriptionEn: string
      placeholderAr: string
      placeholderEn: string
      buttonTextAr: string
      buttonTextEn: string
      successMessageAr: string
      successMessageEn: string
    } | null
  }>
}

export default function FooterSettingsPage() {
  const [footer, setFooter] = useState<Awaited<ReturnType<typeof fetchFooter>> | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const data = await fetchFooter()
      setFooter(data)
    } catch {
      setFooter(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Layout className="h-8 w-8" />
          إعدادات الفوتر
        </h1>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Layout className="h-8 w-8" />
          إعدادات الفوتر
        </h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-1">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="brand">العلامة</TabsTrigger>
          <TabsTrigger value="contact">جهات الاتصال</TabsTrigger>
          <TabsTrigger value="social">وسائل التواصل</TabsTrigger>
          <TabsTrigger value="icons">الأيقونات والتأثيرات</TabsTrigger>
          <TabsTrigger value="columns">الأعمدة والروابط</TabsTrigger>
          <TabsTrigger value="legal">القانوني</TabsTrigger>
          <TabsTrigger value="newsletter">النشرة البريدية</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          <FooterGeneralTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="brand" className="mt-0">
          <FooterBrandTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="contact" className="mt-0">
          <FooterContactTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="social" className="mt-0">
          <FooterSocialTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="icons" className="mt-0">
          <FooterIconsEffectsTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="columns" className="mt-0">
          <FooterColumnsTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="legal" className="mt-0">
          <FooterLegalTab footer={footer} onSave={refresh} />
        </TabsContent>
        <TabsContent value="newsletter" className="mt-0">
          <FooterNewsletterTab footer={footer} onSave={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
