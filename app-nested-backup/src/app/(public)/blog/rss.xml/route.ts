/**
 * RSS 2.0 feed for blog posts.
 */

import { BlogService } from '@/lib/services/blog.service'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const revalidate = 60

export async function GET() {
  const posts = await BlogService.getPostsForFeed(50)

  const rssItems = posts
    .map(
      (p) => `
    <item>
      <title><![CDATA[${escapeXml(p.titleEn)}]]></title>
      <description><![CDATA[${escapeXml(p.excerptEn)}]]></description>
      <link>${BASE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${p.slug}</guid>
      <pubDate>${(p.publishedAt ?? p.updatedAt).toUTCString()}</pubDate>
      <author>contact@flixcam.rent (${escapeXml(p.author.name)})</author>
    </item>`
    )
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>FlixCam Blog - Cinematic Equipment Rental</title>
    <description>Tips and articles on cinematic equipment rental in Riyadh, Saudi Arabia</description>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
