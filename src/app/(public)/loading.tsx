/**
 * Loading UI for public routes. Provides a stable Suspense boundary so the
 * Router tree stays consistent during navigation and Fast Refresh, avoiding
 * "Rendered more hooks than during the previous render" in dev.
 * @see https://github.com/vercel/next.js/issues/63121
 */

export default function PublicLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-hidden>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
    </div>
  )
}
