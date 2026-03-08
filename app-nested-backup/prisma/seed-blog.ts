/**
 * Seed blog categories, author, and sample posts. Idempotent.
 * Run: npm run db:seed:blog
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=630&fit=crop'

const CATEGORIES = [
  { nameAr: 'كاميرات', nameEn: 'Cameras', slug: 'cameras', descriptionAr: 'مقالات عن الكاميرات والمعدات', descriptionEn: 'Articles about cameras and equipment', sortOrder: 1 },
  { nameAr: 'إضاءة', nameEn: 'Lighting', slug: 'lighting', descriptionAr: 'نصائح الإضاءة السينمائية', descriptionEn: 'Cinematic lighting tips', sortOrder: 2 },
  { nameAr: 'صوت', nameEn: 'Audio', slug: 'audio', descriptionAr: 'معدات وتقنيات الصوت', descriptionEn: 'Audio equipment and techniques', sortOrder: 3 },
  { nameAr: 'نصائح التأجير', nameEn: 'Rental Tips', slug: 'rental-tips', descriptionAr: 'دليل تأجير المعدات', descriptionEn: 'Equipment rental guide', sortOrder: 4 },
  { nameAr: 'أخبار الصناعة', nameEn: 'Industry News', slug: 'industry-news', descriptionAr: 'أحدث أخبار صناعة السينما', descriptionEn: 'Latest film industry news', sortOrder: 5 },
]

const SAMPLE_POSTS = [
  { titleAr: 'دليل اختيار كاميرا السينما المناسبة', titleEn: 'Guide to Choosing the Right Cinema Camera', slug: 'guide-choosing-cinema-camera', excerptAr: 'كيف تختار الكاميرا المناسبة لمشروعك السينمائي.', excerptEn: 'How to choose the right camera for your project.', readingTime: 5, featured: true },
  { titleAr: 'أساسيات الإضاءة السينمائية', titleEn: 'Cinematic Lighting Basics', slug: 'cinematic-lighting-basics', excerptAr: 'تعلم أساسيات الإضاءة للمحتوى السينمائي.', excerptEn: 'Learn the basics of lighting for cinematic content.', readingTime: 7, featured: true },
  { titleAr: 'تسجيل الصوت الاحترافي للتلفزيون', titleEn: 'Professional Audio Recording for Film', slug: 'professional-audio-recording', excerptAr: 'نصائح لتسجيل صوت عالي الجودة.', excerptEn: 'Tips for recording high-quality audio.', readingTime: 6, featured: false },
  { titleAr: 'ما الذي تحتاجه لتأجير معدات التصوير؟', titleEn: 'What You Need to Rent Film Equipment', slug: 'what-you-need-rent-equipment', excerptAr: 'المستندات والمتطلبات لتأجير المعدات.', excerptEn: 'Documents and requirements for equipment rental.', readingTime: 4, featured: false },
  { titleAr: 'أفضل كاميرات 2024 للتأجير', titleEn: 'Best Cameras to Rent in 2024', slug: 'best-cameras-rent-2024', excerptAr: 'أحدث الكاميرات المتاحة للتأجير.', excerptEn: 'Latest cameras available for rental.', readingTime: 8, featured: true },
  { titleAr: 'إعداد الاستوديو للبودكاست', titleEn: 'Setting Up a Studio for Podcasting', slug: 'studio-setup-podcasting', excerptAr: 'خطوات إعداد استوديو بودكاست احترافي.', excerptEn: 'Steps to set up a professional podcast studio.', readingTime: 10, featured: false },
  { titleAr: 'الفرق بين الإضاءة الطبيعية والصناعية', titleEn: 'Natural vs Artificial Lighting', slug: 'natural-vs-artificial-lighting', excerptAr: 'مقارنة بين أنواع الإضاءة المختلفة.', excerptEn: 'Comparing different types of lighting.', readingTime: 6, featured: false },
  { titleAr: 'كيف تحافظ على معدات التأجير', titleEn: 'How to Care for Rental Equipment', slug: 'care-rental-equipment', excerptAr: 'نصائح للحفاظ على المعدات المستأجرة.', excerptEn: 'Tips for caring for rented equipment.', readingTime: 5, featured: false },
  { titleAr: 'ميكروفونات اللاف Lavalier: دليل المبتدئين', titleEn: 'Lavalier Mics: A Beginner\'s Guide', slug: 'lavalier-mics-beginners-guide', excerptAr: 'كل ما تحتاج معرفته عن ميكروفونات اللاف.', excerptEn: 'Everything you need to know about lavalier mics.', readingTime: 7, featured: false },
  { titleAr: 'اتجاهات صناعة السينما 2024', titleEn: 'Film Industry Trends 2024', slug: 'film-industry-trends-2024', excerptAr: 'أهم الاتجاهات في صناعة السينما هذا العام.', excerptEn: 'Key trends in the film industry this year.', readingTime: 9, featured: true },
]

const DEFAULT_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is sample blog content. Replace with your actual article text.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'You can add more paragraphs, headings, images, and custom blocks in the admin editor.' },
      ],
    },
  ],
}

async function main() {
  let categoryCount = await prisma.blogCategory.count({ where: { deletedAt: null } })
  if (categoryCount === 0) {
    for (const cat of CATEGORIES) {
      await prisma.blogCategory.upsert({
        where: { slug: cat.slug },
        create: { ...cat },
        update: {},
      })
    }
    console.log(`Created ${CATEGORIES.length} blog categories`)
  } else {
    console.log('Blog categories already exist. Skipping.')
  }

  let author = await prisma.blogAuthor.findFirst({ where: { deletedAt: null } })
  if (!author) {
    author = await prisma.blogAuthor.create({
      data: {
        name: 'فريق فليكس كام',
        slug: 'flixcam-team',
        email: 'blog@flixcam.rent',
        bioAr: 'فريق محتوى متخصص في تأجير معدات التصوير السينمائي والاستوديوهات.',
        bioEn: 'Content team specializing in cinema equipment and studio rentals.',
        role: 'EDITOR',
      },
    })
    console.log('Created blog author')
  } else {
    console.log('Blog author already exists. Skipping.')
  }

  const categories = await prisma.blogCategory.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true },
  })
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  let postCount = await prisma.blogPost.count({ where: { deletedAt: null } })
  if (postCount === 0) {
    const now = new Date()
    for (let i = 0; i < SAMPLE_POSTS.length; i++) {
      const p = SAMPLE_POSTS[i]
      const categoryId = catBySlug['cameras'] ?? categories[0]!.id
      const slug = p.slug
      const publishedAt = new Date(now)
      publishedAt.setDate(publishedAt.getDate() - (SAMPLE_POSTS.length - i))

      await prisma.blogPost.upsert({
        where: { slug },
        create: {
          titleAr: p.titleAr,
          titleEn: p.titleEn,
          slug,
          excerptAr: p.excerptAr,
          excerptEn: p.excerptEn,
          content: DEFAULT_CONTENT,
          coverImage: PLACEHOLDER_IMAGE,
          categoryId,
          authorId: author.id,
          status: 'PUBLISHED',
          publishedAt,
          readingTime: p.readingTime,
          featured: p.featured,
          trending: i < 2,
          views: Math.floor(Math.random() * 200),
          relatedEquipmentIds: [],
        },
        update: {},
      })
    }
    console.log(`Created ${SAMPLE_POSTS.length} blog posts`)
  } else {
    console.log('Blog posts already exist. Skipping.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
