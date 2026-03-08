/**
 * Loading state for studios list page.
 */

import { Skeleton } from '@/components/ui/skeleton'

export default function StudiosLoading() {
  return (
    <main className="mx-auto w-full max-w-public-container px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border bg-card">
            <Skeleton className="aspect-[16/10] w-full" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
