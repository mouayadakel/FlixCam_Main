import { BlogPostSkeleton } from '@/components/blog/blog-post-skeleton'

export default function BlogPostLoading() {
  return (
    <main className="min-h-screen bg-white">
      <BlogPostSkeleton />
    </main>
  )
}
