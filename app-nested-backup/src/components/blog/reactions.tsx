/**
 * Was this helpful? reactions - Yes/No buttons.
 */

'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { trackBlogEvent } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import type { ReactionCounts } from '@/lib/types/blog.types'

interface ReactionsProps {
  postId: string
  initialCounts: ReactionCounts
  locale: string
  onReact?: (type: 'HELPFUL_YES' | 'HELPFUL_NO') => void
}

export function Reactions({ postId, initialCounts, locale, onReact }: ReactionsProps) {
  const [counts, setCounts] = useState(initialCounts)
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null)

  const handleVote = async (type: 'HELPFUL_YES' | 'HELPFUL_NO') => {
    if (voted) return
    try {
      const res = await fetch('/api/blog/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type }),
      })
      if (res.ok) {
        const data = await res.json()
        setCounts(data.counts ?? counts)
        setVoted(type === 'HELPFUL_YES' ? 'yes' : 'no')
        trackBlogEvent('blog_reaction', {
          post_id: postId,
          type: type === 'HELPFUL_YES' ? 'helpful_yes' : 'helpful_no',
        })
        onReact?.(type)
      }
    } catch {
      // ignore
    }
  }

  const question = locale === 'ar' ? 'هل كان هذا المقال مفيداً؟' : 'Was this helpful?'
  const yesLabel = locale === 'ar' ? 'نعم' : 'Yes'
  const noLabel = locale === 'ar' ? 'لا' : 'No'

  return (
    <div className="my-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
      <p className="mb-4 font-medium text-gray-900">{question}</p>
      <div className="flex gap-4">
        <Button
          variant={voted === 'yes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleVote('HELPFUL_YES')}
          disabled={!!voted}
          className={voted === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <ThumbsUp className="me-2 h-4 w-4" />
          {yesLabel}
          {counts.helpfulYes > 0 && (
            <span className="ms-2 text-xs">({counts.helpfulYes})</span>
          )}
        </Button>
        <Button
          variant={voted === 'no' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleVote('HELPFUL_NO')}
          disabled={!!voted}
          className={voted === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <ThumbsDown className="me-2 h-4 w-4" />
          {noLabel}
          {counts.helpfulNo > 0 && (
            <span className="ms-2 text-xs">({counts.helpfulNo})</span>
          )}
        </Button>
      </div>
    </div>
  )
}
