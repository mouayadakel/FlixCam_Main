/**
 * Blog card skeleton - loading placeholder.
 */

export function BlogCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="aspect-[16/10] animate-pulse bg-gray-200" />
      <div className="p-5">
        <div className="mb-2 h-5 w-20 animate-pulse rounded-full bg-gray-200" />
        <div className="h-5 w-3/4 animate-pulse rounded-lg bg-gray-200" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 flex gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </article>
  )
}
