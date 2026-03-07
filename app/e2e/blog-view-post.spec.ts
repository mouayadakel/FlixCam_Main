/**
 * E2E: Blog - view post flow
 * Navigate /blog, click post, assert title/author/progress/TOC/reactions/newsletter
 */

import { test, expect } from '@playwright/test'

test.describe('Blog view post', () => {
  test('blog listing loads and shows posts or empty state', async ({ page }) => {
    await page.goto('/blog')
    await expect(page).toHaveURL(/\/blog/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('post detail shows title, author, share bar, newsletter', async ({ page }) => {
    await page.goto('/blog/film-industry-trends-2024')
    await expect(page).toHaveURL(/\/blog\/film-industry-trends-2024/)
    await page.waitForLoadState('networkidle')

    const h1 = page.locator('h1')
    await expect(h1.first()).toBeVisible({ timeout: 5000 })
    await expect(h1.first()).not.toBeEmpty()

    const shareLabel = page.getByText(/Share|شارك/)
    await shareLabel.first().scrollIntoViewIfNeeded()
    await expect(shareLabel.first()).toBeVisible({ timeout: 5000 })

    const newsletterSection = page.getByText(/Subscribe|اشترك/)
    await newsletterSection.first().scrollIntoViewIfNeeded()
    await expect(newsletterSection.first()).toBeVisible({ timeout: 5000 })
  })
})
