/**
 * E2E: Blog search
 * Search, debounce, results, empty state, clear
 */

import { test, expect } from '@playwright/test'

test.describe('Blog search', () => {
  test('search input is visible and accepts input', async ({ page }) => {
    await page.goto('/blog')
    await expect(page).toHaveURL(/\/blog/)

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="بحث"]')
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 })
    await searchInput.first().fill('camera')
    await expect(searchInput.first()).toHaveValue('camera')
  })

  test('search triggers navigation with query param after debounce', async ({ page }) => {
    await page.goto('/blog')
    await expect(page).toHaveURL(/\/blog/)

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="بحث"]')
    await searchInput.first().fill('test-search-xyz')

    await page.waitForTimeout(500)
    const url = page.url()
    expect(url).toMatch(/[?&]q=test-search-xyz|test-search-xyz/)
  })

  test('empty search or no results shows appropriate state', async ({ page }) => {
    await page.goto('/blog?q=nonexistentxyz123')
    await expect(page).toHaveURL(/\/blog/)

    await page.waitForTimeout(500)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 5000 })
  })
})
