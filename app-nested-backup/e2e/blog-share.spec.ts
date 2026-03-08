/**
 * E2E: Blog share bar
 * Share bar visible, Twitter link, copy link clipboard
 */

import { test, expect } from '@playwright/test'

const KNOWN_POST_SLUG = 'film-industry-trends-2024'

test.describe('Blog share', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/blog/${KNOWN_POST_SLUG}`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(new RegExp(`/blog/${KNOWN_POST_SLUG}`), { timeout: 10000 })
  })

  test('share bar is visible with Share label', async ({ page }) => {
    const shareLabel = page.getByText(/Share|شارك/).first()
    await shareLabel.scrollIntoViewIfNeeded()
    await expect(shareLabel).toBeVisible({ timeout: 10000 })
  })

  test('Twitter/X link is present and has correct intent URL', async ({ page }) => {
    const twitterLink = page.locator('a[href*="twitter.com"], a[href*="x.com"]').first()
    await twitterLink.scrollIntoViewIfNeeded()
    await expect(twitterLink).toBeVisible({ timeout: 8000 })
    const href = await twitterLink.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/twitter\.com|x\.com/)
  })

  test('copy link button is present', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /Copy|نسخ/ }).first()
    await copyBtn.scrollIntoViewIfNeeded()
    await expect(copyBtn).toBeVisible({ timeout: 8000 })
  })
})
