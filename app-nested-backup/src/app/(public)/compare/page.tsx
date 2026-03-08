/**
 * Compare page — side-by-side equipment comparison (2–4 items).
 * URL: /compare?ids=id1,id2,id3
 */

import { Suspense } from 'react'
import { ComparePageClient } from './compare-client'

export const metadata = {
  title: 'مقارنة المعدات — FlixCam',
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-text-muted">
          جاري التحميل...
        </div>
      }
    >
      <ComparePageClient />
    </Suspense>
  )
}
