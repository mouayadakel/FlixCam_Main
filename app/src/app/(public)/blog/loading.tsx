import { BlogListingSkeleton } from '@/components/blog/blog-listing-skeleton'

export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <BlogListingSkeleton />
    </main>
  )
}
