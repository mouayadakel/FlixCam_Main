import { redirect } from 'next/navigation'

/** Loyalty CRM uses real client data under /admin/clients */
export default function LegacyCrmRedirect() {
  redirect('/admin/clients')
}
