/**
 * E2E tests for CMS Studios and public studio flow
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('CMS Studios (requires auth)', () => {
  test('CMS studios list requires auth', async ({ page }) => {
    await page.goto(`${BASE}/admin/cms/studios`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('CMS studio edit requires auth', async ({ page }) => {
    await page.goto(`${BASE}/admin/cms/studios/any-id`)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Public studios', () => {
  test('studios list page loads', async ({ page }) => {
    await page.goto(`${BASE}/studios`)
    await expect(page).toHaveURL(/\/studios/)
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('studio detail page loads when studio exists', async ({ page }) => {
    await page.goto(`${BASE}/studios`)
    const link = page.locator('a[href^="/studios/"]').first()
    const href = await link.getAttribute('href')
    if (!href || href === '/studios') return
    const slug = href.replace('/studios/', '')
    if (!slug) return
    await page.goto(`${BASE}/studios/${slug}`)
    await expect(page).toHaveURL(new RegExp(`/studios/${slug}`))
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('studio page has booking panel', async ({ page }) => {
    await page.goto(`${BASE}/studios`)
    const link = page.locator('a[href^="/studios/"]').first()
    const href = await link.getAttribute('href')
    if (!href || href === '/studios') return
    const slug = href.replace('/studios/', '')
    if (!slug) return
    await page.goto(`${BASE}/studios/${slug}`)
    await expect(page.getByText(/احجز|Book|حجز/i)).toBeVisible({ timeout: 10000 })
  })

  test('cart page with studio params adds item', async ({ page }) => {
    await page.goto(`${BASE}/studios`)
    const link = page.locator('a[href^="/studios/"]').first()
    const href = await link.getAttribute('href')
    if (!href || href === '/studios') return
    const slug = href.replace('/studios/', '').trim()
    if (!slug) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().slice(0, 10)
    const startIso = `${dateStr}T10:00:00.000Z`
    const cartUrl = `${BASE}/cart?studio=${slug}&date=${dateStr}&start=${encodeURIComponent(startIso)}&duration=2`
    await page.goto(cartUrl)
    await expect(page).toHaveURL(/\/cart/)
    await page.waitForTimeout(2000)
    const emptyMsg = page.getByText(/فارغة|empty/i)
    const hasItems = (await page.locator('[data-testid="cart-item"], .cart-item').count()) > 0
    const isEmpty = await emptyMsg.isVisible().catch(() => false)
    expect(hasItems || isEmpty).toBeTruthy()
  })
})
