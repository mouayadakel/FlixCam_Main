import { redirect } from 'next/navigation'

/** Canonical warehouse ops live under /admin/ops/warehouse */
export default function LegacyWarehouseRedirect() {
  redirect('/admin/ops/warehouse')
}
