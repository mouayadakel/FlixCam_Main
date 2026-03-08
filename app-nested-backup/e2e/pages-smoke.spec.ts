/**
 * E2E: Page smoke tests (Phase 8)
 * Verify key routes return 200 and render without crash
 */

import { test, expect } from '@playwright/test'

const ROUTES = [
  '/',
  '/equipment',
  '/cart',
  '/blog',
  '/about',
  '/contact',
  '/studios',
  '/categories',
  '/faq',
  '/login',
  '/register',
  '/403',
]

test.describe('Page smoke tests', () => {
  for (const route of ROUTES) {
    test(`${route} returns 200 and renders`, async ({ page }) => {
      const response = await page.goto(route)
      expect(response?.status()).toBe(200)
      const body = page.locator('body')
      await expect(body).toBeVisible({ timeout: 15000 })
      await expect(body).not.toContainText('Application error')
    })
  }
})
