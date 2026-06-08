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
  '/privacy',
  '/terms',
  '/portal/dashboard',
  '/portal/bookings',
  '/portal/invoices',
]

test.describe('Page smoke tests', () => {
  for (const route of ROUTES) {
    test(`${route} returns expected status and renders`, async ({ page }) => {
      const response = await page.goto(route)
      const status = response?.status() ?? 0
      const isPortalRoute = route.startsWith('/portal/')
      if (isPortalRoute) {
        expect(status).toBeGreaterThanOrEqual(300)
        expect(status).toBeLessThan(400)
      } else {
        expect(status).toBe(200)
      }
      const body = page.locator('body')
      await expect(body).toBeVisible({ timeout: 15000 })
      await expect(body).not.toContainText('Application error')
    })
  }
})
