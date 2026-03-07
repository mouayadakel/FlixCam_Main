/**
 * @file page.tsx
 * @description Redirect to CMS Policies. Policies is now under Admin → CMS → Policies.
 */

import { redirect } from 'next/navigation'

export default function SettingsPoliciesRedirect() {
  redirect('/admin/cms/policies')
}
