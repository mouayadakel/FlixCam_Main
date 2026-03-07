/**
 * E2E tests for AI Dashboard (Phase 5).
 * Unauthenticated: redirect to login. With PLAYWRIGHT_ADMIN_EMAIL + PLAYWRIGHT_ADMIN_PASSWORD: login and run full flow.
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const AI_DASHBOARD = `${BASE}/admin/ai-dashboard`
const LOGIN_URL = `${BASE}/login`

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(LOGIN_URL)
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  const email = page.locator('input[name="email"], input[type="email"]').first()
  const password = page.locator('input[name="password"], input[type="password"]').first()
  await email.fill(process.env.PLAYWRIGHT_ADMIN_EMAIL!)
  await password.fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15000 })
}

test.describe('AI Dashboard', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto(AI_DASHBOARD)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test.describe('when authenticated as admin', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.PLAYWRIGHT_ADMIN_EMAIL || !process.env.PLAYWRIGHT_ADMIN_PASSWORD,
        'PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD must be set for authenticated tests'
      )
      await loginAsAdmin(page)
    })

    test('dashboard page and tabs are visible', async ({ page }) => {
      await page.goto(AI_DASHBOARD)
      await expect(page.locator('[data-testid="ai-dashboard-page"]')).toBeVisible({
        timeout: 15000,
      })
      await expect(page.locator('[data-testid="ai-dashboard-title"]')).toContainText(
        'لوحة الذكاء الاصطناعي'
      )
      await expect(page.locator('[data-testid="ai-dashboard-tablist"]')).toBeVisible()
      await expect(page.locator('[data-testid="ai-tab-overview"]')).toBeVisible()
      await expect(page.locator('[data-testid="ai-tab-content-health"]')).toBeVisible()
      await expect(page.locator('[data-testid="ai-tab-analytics"]')).toBeVisible()
    })

    test('switching to analytics tab shows analytics content', async ({ page }) => {
      await page.goto(AI_DASHBOARD)
      await page.locator('[data-testid="ai-tab-analytics"]').click()
      await expect(page.locator('[data-testid="ai-tabpanel-analytics"]')).toBeVisible()
    })
  })
})
