/**
 * Seed default footer CMS data. Idempotent: skips if FooterSettings already exists.
 * Run: npm run db:seed:footer
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.footerSettings.count()
  if (existing > 0) {
    console.log('Footer settings already exist. Skip seed.')
    return
  }

  const footer = await prisma.footerSettings.create({
    data: {
      enabled: true,
      layout: 'default',
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      linkColor: '#10b981',
      linkHoverColor: '#34d399',
      brand: {
        create: {
          logoLight: '/logos/flixcam-light.svg',
          logoDark: '/logos/flixcam-dark.svg',
          companyNameAr: 'فليكس كام',
          companyNameEn: 'Flixcam',
          descriptionAr:
            'استوديو بودكاست وتأجير معدات السينمائية والاستوديوهات احترافي في الرياض. نحن نقدم خدمات متميزة وأحدث المعدات.',
          descriptionEn:
            'Professional podcast studio and cinema equipment rental in Riyadh. We provide outstanding services and the latest equipment.',
          showBrand: true,
        },
      },
      contacts: {
        createMany: {
          data: [
            {
              type: 'phone',
              labelAr: 'خدمة العملاء',
              labelEn: 'Customer Service',
              value: '+966 11 966 XXXX',
              icon: 'phone',
              whatsappEnabled: true,
              order: 1,
              enabled: true,
            },
            {
              type: 'email',
              labelAr: 'البريد الإلكتروني',
              labelEn: 'Email',
              value: 'contact@flixcam.rent',
              icon: 'envelope',
              order: 2,
              enabled: true,
            },
            {
              type: 'address',
              labelAr: 'الموقع',
              labelEn: 'Location',
              value: 'الرياض، المملكة العربية السعودية',
              icon: 'location-dot',
              mapsLink: 'https://maps.google.com/?q=Riyadh',
              order: 3,
              enabled: true,
            },
          ],
        },
      },
      socialLinks: {
        createMany: {
          data: [
            { platform: 'instagram', url: 'https://instagram.com/flixcam.sa', order: 1, enabled: true },
            { platform: 'whatsapp', url: 'https://wa.me/966500000000', order: 2, enabled: true },
            { platform: 'twitter', url: 'https://twitter.com/flixcam_sa', order: 3, enabled: true },
            { platform: 'tiktok', url: 'https://tiktok.com/@flixcam.sa', order: 4, enabled: true },
            { platform: 'youtube', url: 'https://youtube.com/@flixcam', order: 5, enabled: true },
            { platform: 'snapchat', url: 'https://snapchat.com/add/flixcam.sa', order: 6, enabled: true },
          ],
        },
      },
      legal: {
        create: {
          copyrightAr: '© {year} جميع الحقوق محفوظة لـ فليكس كام',
          copyrightEn: '© {year} All rights reserved to Flixcam',
          autoYear: true,
          layout: 'center',
          links: {
            createMany: {
              data: [
                { textAr: 'الشروط والأحكام', textEn: 'Terms & Conditions', url: '/terms', order: 1, enabled: true },
                { textAr: 'سياسة الخصوصية', textEn: 'Privacy Policy', url: '/policies', order: 2, enabled: true },
                { textAr: 'سياسة الإرجاع', textEn: 'Return Policy', url: '/policies', order: 3, enabled: true },
              ],
            },
          },
        },
      },
      newsletter: {
        create: {
          enabled: true,
          titleAr: 'اشترك في النشرة البريدية',
          titleEn: 'Subscribe to Newsletter',
          descriptionAr: 'احصل على آخر العروض والأخبار',
          descriptionEn: 'Get the latest offers and news',
          placeholderAr: 'أدخل بريدك الإلكتروني',
          placeholderEn: 'Enter your email',
          buttonTextAr: 'اشترك',
          buttonTextEn: 'Subscribe',
          successMessageAr: 'تم الاشتراك بنجاح!',
          successMessageEn: 'Successfully subscribed!',
        },
      },
    },
  })

  await prisma.footerColumn.create({
    data: {
      footerId: footer.id,
      titleAr: 'التصنيفات',
      titleEn: 'Categories',
      showTitle: true,
      order: 1,
      enabled: true,
      links: {
        createMany: {
          data: [
            { textAr: 'المعدات', textEn: 'Equipment', linkType: 'internal', url: '/equipment', icon: 'camera', order: 1, enabled: true },
            { textAr: 'الاستوديوهات', textEn: 'Studios', linkType: 'internal', url: '/studios', icon: 'building', order: 2, enabled: true },
            { textAr: 'الباقات', textEn: 'Packages', linkType: 'internal', url: '/packages', icon: 'box', order: 3, enabled: true },
            { textAr: 'ابنِ كيتك', textEn: 'Build Your Kit', linkType: 'internal', url: '/build-your-kit', icon: 'wrench', order: 4, enabled: true },
          ],
        },
      },
    },
  })

  await prisma.footerColumn.create({
    data: {
      footerId: footer.id,
      titleAr: 'عن الموقع',
      titleEn: 'About',
      showTitle: true,
      order: 2,
      enabled: true,
      links: {
        createMany: {
          data: [
            { textAr: 'من نحن', textEn: 'Who We Are', linkType: 'internal', url: '/about', order: 1, enabled: true },
            { textAr: 'تواصل معنا', textEn: 'Contact Us', linkType: 'internal', url: '/contact', order: 2, enabled: true },
            { textAr: 'كيف يعمل', textEn: 'How It Works', linkType: 'internal', url: '/how-it-works', order: 3, enabled: true },
            { textAr: 'الدعم', textEn: 'Support', linkType: 'internal', url: '/support', order: 4, enabled: true },
            { textAr: 'الأسئلة الشائعة', textEn: 'FAQ', linkType: 'internal', url: '/faq', order: 5, enabled: true },
          ],
        },
      },
    },
  })

  await prisma.footerColumn.create({
    data: {
      footerId: footer.id,
      titleAr: 'السياسات',
      titleEn: 'Policies',
      showTitle: true,
      order: 3,
      enabled: true,
      links: {
        createMany: {
          data: [
            { textAr: 'الشروط والأحكام', textEn: 'Terms & Conditions', linkType: 'internal', url: '/terms', order: 1, enabled: true },
            { textAr: 'سياسة الإرجاع', textEn: 'Return Policy', linkType: 'internal', url: '/policies', order: 2, enabled: true },
            { textAr: 'سياسة الشحن', textEn: 'Shipping Policy', linkType: 'internal', url: '/policies', order: 3, enabled: true },
            { textAr: 'سياسة الإلغاء', textEn: 'Cancellation Policy', linkType: 'internal', url: '/policies', order: 4, enabled: true },
          ],
        },
      },
    },
  })

  await prisma.footerColumn.create({
    data: {
      footerId: footer.id,
      titleAr: 'روابط سريعة',
      titleEn: 'Quick Links',
      showTitle: true,
      order: 4,
      enabled: true,
      links: {
        createMany: {
          data: [
            { textAr: 'حسابي', textEn: 'My Account', linkType: 'internal', url: '/portal', icon: 'user', order: 1, enabled: true },
            { textAr: 'الطلبات', textEn: 'Orders', linkType: 'internal', url: '/portal', icon: 'shopping-bag', order: 2, enabled: true },
            { textAr: 'المفضلة', textEn: 'Wishlist', linkType: 'internal', url: '/portal', icon: 'heart', order: 3, enabled: true },
            { textAr: 'المدونة', textEn: 'Blog', linkType: 'internal', url: '/blog', icon: 'book', order: 4, enabled: true },
            { textAr: 'الوظائف', textEn: 'Careers', linkType: 'internal', url: '/careers', icon: 'briefcase', order: 5, enabled: true },
          ],
        },
      },
    },
  })

  console.log('Footer data seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
