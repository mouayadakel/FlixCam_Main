/**
 * @file page.tsx
 * @description Redirect to unified AI settings page
 * @module app/admin/(routes)/settings/ai-control
 */

import { redirect } from 'next/navigation'

export default function AIControlRedirect() {
  redirect('/admin/settings/ai')
}
