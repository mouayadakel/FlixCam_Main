/**
 * Dynamic OG image generation for blog posts.
 * GET /api/og?slug=post-slug
 * GET /api/og?title=...&category=...&author=...
 */

import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { BlogService } from '@/lib/services/blog.service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const titleParam = searchParams.get('title')
  const categoryParam = searchParams.get('category')
  const authorParam = searchParams.get('author')

  let title = titleParam ?? 'FlixCam Blog'
  let category = categoryParam ?? ''
  let author = authorParam ?? 'FlixCam'

  if (slug) {
    const post = await BlogService.getPostBySlug(slug)
    if (post) {
      title = post.titleEn
      category = post.category.nameEn
      author = post.author.name
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          padding: 48,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            F
          </div>
          <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 600 }}>FlixCam.rent</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          <h1
            style={{
              color: 'white',
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              maxWidth: 900,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h1>
          <div style={{ display: 'flex', gap: 24, color: '#94a3b8', fontSize: 20 }}>
            {category && (
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                {category}
              </span>
            )}
            <span>{author}</span>
          </div>
        </div>

        <div style={{ color: '#64748b', fontSize: 16 }}>
          Premium camera & cinema equipment rental • Riyadh, Saudi Arabia
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
