import { redirect } from 'next/navigation'

// This page has been superseded by /admin/marketing/automations (with an "s").
// Redirect to the correct page.
export default function AutomationRedirect() {
  redirect('/admin/marketing/automations')
}
