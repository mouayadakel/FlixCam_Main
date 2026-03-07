/**
 * Blog post detail skeleton - loading placeholder.
 */

export function BlogPostSkeleton() {
  return (
    <article className="mx-auto max-w-4xl">
      {/* Cover skeleton */}
      <header className="relative h-[320px] overflow-hidden bg-gray-900 md:h-[420px]">
        <div className="absolute inset-0 animate-pulse bg-gray-800" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-600" />
          <div className="mb-2 h-6 w-24 animate-pulse rounded-full bg-gray-600" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-gray-600 md:h-12" />
          <div className="mt-4 flex gap-4">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-600" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-600" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-32 w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          </div>
          <aside className="w-56 shrink-0">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}
