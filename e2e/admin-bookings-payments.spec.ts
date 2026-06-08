/**
 * E2E: Admin bookings & payments (authenticated smoke)
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/login`)
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  await page.locator('input[name="email"], input[type="email"]').first().fill(process.env.PLAYWRIGHT_ADMIN_EMAIL!)
  await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15000 })
}

test.describe('Admin bookings & payments', () => {
  test('unauthenticated bookings redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/admin/bookings`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('unauthenticated payments redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/admin/payments`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('unauthenticated invoices redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/admin/invoices`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test.describe('when authenticated as admin', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.PLAYWRIGHT_ADMIN_EMAIL || !process.env.PLAYWRIGHT_ADMIN_PASSWORD,
        'PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD required'
      )
      await loginAsAdmin(page)
    })

    test('bookings page loads', async ({ page }) => {
      await page.goto(`${BASE}/admin/bookings`)
      await expect(page).toHaveURL(/\/admin\/bookings/)
      await expect(page.locator('body')).toContainText(/حجز|booking/i, { timeout: 10000 })
    })

    test('payments page loads', async ({ page }) => {
      await page.goto(`${BASE}/admin/payments`)
      await expect(page).toHaveURL(/\/admin\/payments/)
      await expect(page.locator('body')).toContainText(/دفع|payment/i, { timeout: 10000 })
    })

    test('invoices page loads', async ({ page }) => {
      await page.goto(`${BASE}/admin/invoices`)
      await expect(page).toHaveURL(/\/admin\/invoices/)
      await expect(page.locator('body')).toContainText(/فاتور|invoice/i, { timeout: 10000 })
    })

    test('cron ops page loads', async ({ page }) => {
      await page.goto(`${BASE}/admin/ops/cron`)
      await expect(page).toHaveURL(/\/admin\/ops\/cron/)
      await expect(page.getByText(/Cron|Scheduled Jobs/i)).toBeVisible({ timeout: 10000 })
    })
  })
})
