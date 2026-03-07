/**
 * Blog-specific sitemap for SEO.
 */

import { BlogService } from '@/lib/services/blog.service'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const revalidate = 60

export async function GET() {
  const posts = await BlogService.getPostsForFeed(500)

  const urls = posts.map((p) => {
    const lastmod = p.updatedAt.toISOString().split('T')[0]
    const priority = p.featured || p.trending ? 0.9 : 0.8
    const changefreq = p.featured || p.trending ? 'weekly' : 'monthly'
    return `  <url>
    <loc>${BASE_URL}/blog/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  })

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${urls.join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
