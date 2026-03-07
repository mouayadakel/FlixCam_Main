/**
 * E2E tests for admin flow
 * Admin login → view bookings → basic navigation
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Admin flow', () => {
  test('admin redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE}/admin`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin dashboard requires auth', async ({ page }) => {
    await page.goto(`${BASE}/admin/dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin bookings page requires auth', async ({ page }) => {
    await page.goto(`${BASE}/admin/bookings`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page loads with form', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page).toHaveURL(/\/login/)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 })
    await expect(passwordInput.first()).toBeVisible({ timeout: 5000 })
  })

  test('403 page loads and shows access denied message', async ({ page }) => {
    await page.goto(`${BASE}/403`)
    await expect(page).toHaveURL(/\/403/)
    await expect(page.getByText(/تم رفض الوصول|Access Denied/i)).toBeVisible({ timeout: 5000 })
  })
})
