/**
 * E2E: Layout structure (Phase 8)
 * Public layout: skip link, main content, header, footer
 */

import { test, expect } from '@playwright/test'

test.describe('Public layout', () => {
  test('skip to main content link exists', async ({ page }) => {
    await page.goto('/')
    const skipLink = page.getByRole('link', { name: /skip to main content|انتقل للمحتوى/i })
    await expect(skipLink.first()).toBeVisible({ timeout: 5000 })
    expect(await skipLink.first().getAttribute('href')).toBe('#main-content')
  })

  test('main content has id for skip link', async ({ page }) => {
    await page.goto('/')
    const main = page.locator('#main-content, [id="main-content"]')
    await expect(main.first()).toBeVisible({ timeout: 10000 })
  })

  test('homepage has header/nav', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible({ timeout: 10000 })
  })

  test('homepage has footer', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer').first()
    await expect(footer).toBeVisible({ timeout: 10000 })
  })

  test('page has document title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FlixCam|flixcam/i)
  })
})
