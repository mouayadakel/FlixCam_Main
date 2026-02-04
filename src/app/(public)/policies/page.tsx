/**
 * Policies index placeholder.
 */

import Link from 'next/link'

export default function PoliciesPage() {
  return (
    <main className="container mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">السياسات</h1>
      <ul className="space-y-2">
        <li>
          <Link href="/privacy" className="underline">سياسة الخصوصية</Link>
        </li>
        <li>
          <Link href="/terms" className="underline">الشروط والأحكام</Link>
        </li>
      </ul>
    </main>
  )
}
