/**
 * Contact page – form + contact info from SiteConfig/Branch.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { siteConfig } from '@/config/site.config'
import { PublicContainer } from '@/components/public/public-container'
import { ContactForm } from '@/components/public/contact/contact-form'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/utils/whatsapp-context'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export const metadata: Metadata = {
  title: t('ar', 'seo.contactTitle'),
  description: t('ar', 'seo.contactDescription'),
  alternates: generateAlternatesMetadata('/contact'),
  keywords: ['تواصل', 'اتصل بنا', 'دعم', 'استفسار', 'FlixCam contact'],
}

async function getPrimaryBranch() {
  try {
    const branch = await prisma.branch.findFirst({
      where: { isActive: true },
      select: {
        name: true,
        nameAr: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        workingHours: true,
      },
    })
    return branch
  } catch {
    return null
  }
}

export default async function ContactPage() {
  const branch = await getPrimaryBranch()
  const address = branch?.address || branch?.city || 'الرياض، المملكة العربية السعودية'
  const phone = branch?.phone || siteConfig.contact.phone
  const email = branch?.email || siteConfig.contact.email
  const whatsappUrl = getWhatsAppUrl({
    number: siteConfig.contact.whatsappNumber,
    message: 'مرحباً، أود الاستفسار عن الخدمات',
  })

  return (
    <main className="min-h-screen" id="main-content">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <PublicContainer className="relative">
          <h1 className="text-center text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            تواصل معنا
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-white/85">
            لديك سؤال أو استفسار؟ راسلنا وسنرد في أقرب وقت.
          </p>
        </PublicContainer>
      </section>

      {/* Form + Contact Info */}
      <section className="border-t border-border-light/50 bg-white py-12 md:py-16">
        <PublicContainer>
          <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 shadow-card md:p-8">
                <h2 className="mb-6 text-xl font-bold text-text-heading">أرسل رسالة</h2>
                <ContactForm />
              </div>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 shadow-card md:p-8">
                <h2 className="mb-6 text-xl font-bold text-text-heading">معلومات التواصل</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
                    <div>
                      <p className="font-medium text-text-heading">
                        {branch?.nameAr || branch?.name || 'FlixCam'}
                      </p>
                      <p className="text-sm text-text-muted">{address}</p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-brand-primary transition-colors hover:underline"
                      >
                        فتح في خرائط Google
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 shrink-0 text-brand-primary" />
                    <a
                      href={`tel:${phone.replace(/\s/g, '')}`}
                      className="text-text-body hover:text-brand-primary"
                    >
                      {phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-brand-primary" />
                    <a href={`mailto:${email}`} className="text-text-body hover:text-brand-primary">
                      {email}
                    </a>
                  </div>
                  <div className="pt-4">
                    <Button asChild size="lg" className="w-full">
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="ms-2 h-5 w-5" />
                        تواصل عبر واتساب
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PublicContainer>
      </section>

      {/* CTA */}
      <section className="border-t border-border-light/50 bg-surface-light/30 py-12 md:py-16">
        <PublicContainer className="text-center">
          <h2 className="text-2xl font-bold text-text-heading">لم تجد إجابتك؟</h2>
          <p className="mx-auto mt-2 max-w-md text-text-muted">
            تصفح الأسئلة الشائعة أو تواصل معنا مباشرة
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline" size="lg">
              <Link href="/faq">الأسئلة الشائعة</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/support">صفحة الدعم</Link>
            </Button>
          </div>
        </PublicContainer>
      </section>
    </main>
  )
}
