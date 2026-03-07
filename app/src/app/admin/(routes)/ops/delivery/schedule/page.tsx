/**
 * @file page.tsx
 * @description Redirects to Delivery page with Schedule tab
 * @module app/admin/(routes)/ops/delivery/schedule
 */

import { redirect } from 'next/navigation'

export default function DeliveryScheduleRedirect() {
  redirect('/admin/ops/delivery?tab=schedule')
}
