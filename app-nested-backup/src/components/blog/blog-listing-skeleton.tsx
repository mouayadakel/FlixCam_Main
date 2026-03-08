/**
 * Blog listing page skeleton - loading placeholder.
 */

import { BlogCardSkeleton } from './blog-card-skeleton'

export function BlogListingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero skeleton */}
      <div className="mb-12 rounded-2xl bg-gray-900 p-8 md:p-12">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-700" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded bg-gray-700 md:h-12 md:w-96" />
        <div className="mt-2 h-5 w-48 animate-pulse rounded bg-gray-700 md:w-72" />
        <div className="mt-6 flex gap-4">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-700" />
          <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-700" />
        </div>
      </div>

      {/* Search skeleton */}
      <div className="mb-8">
        <div className="h-11 w-full max-w-md animate-pulse rounded-xl bg-gray-200" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-12 flex justify-center gap-2">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  )
}
