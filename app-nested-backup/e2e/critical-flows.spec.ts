/**
 * E2E critical flows (Phase 8.3). Run with: npx playwright test
 * Requires: npm i -D @playwright/test && npx playwright install
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Public website', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveTitle(/FlixCam/)
  })

  test('equipment catalog loads', async ({ page }) => {
    await page.goto(`${BASE}/equipment`)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
  })

  test('cart page loads', async ({ page }) => {
    await page.goto(`${BASE}/cart`)
    await expect(page).toHaveURL(/\/cart/)
  })
})

test.describe('Portal (requires auth)', () => {
  test('portal redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE}/portal/dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })
})
