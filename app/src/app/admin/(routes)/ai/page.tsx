/**
 * Redirect legacy /admin/ai to new AI Dashboard
 */
import { redirect } from 'next/navigation'

export default function AIPageRedirect() {
  redirect('/admin/ai-dashboard')
}
