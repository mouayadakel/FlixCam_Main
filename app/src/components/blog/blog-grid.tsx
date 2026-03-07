/**
 * Blog post grid - responsive 3-column layout with stagger animations.
 */

import type { BlogPostListItem } from '@/lib/types/blog.types'
import { BlogCard } from './blog-card'

interface BlogGridProps {
  posts: BlogPostListItem[]
  locale: string
}

export function BlogGrid({ posts, locale }: BlogGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' } as React.CSSProperties}
        >
          <BlogCard post={post} locale={locale} />
        </div>
      ))}
    </div>
  )
}
