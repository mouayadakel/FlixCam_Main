/**
 * View counter - fires POST to /api/blog/views on mount (client-side).
 * Tracks blog_view to GA4 when counted.
 */

'use client'

import { useEffect, useRef } from 'react'
import { trackBlogEvent } from '@/lib/analytics'

interface ViewCounterProps {
  postId: string
  slug?: string
}

export function ViewCounter({ postId, slug }: ViewCounterProps) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    fetch('/api/blog/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.counted) {
          trackBlogEvent('blog_view', { post_id: postId, post_slug: slug ?? '' })
        }
      })
      .catch(() => {})
  }, [postId, slug])

  return null
}
