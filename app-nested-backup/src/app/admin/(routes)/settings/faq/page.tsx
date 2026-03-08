/**
 * @file page.tsx
 * @description Redirect to CMS FAQ. FAQ is now under Admin → CMS → FAQ.
 */

import { redirect } from 'next/navigation'

export default function SettingsFaqRedirect() {
  redirect('/admin/cms/faq')
}
