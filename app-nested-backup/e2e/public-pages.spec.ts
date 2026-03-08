/**
 * E2E: Public pages (Phase 8)
 * About, Contact, Studios, Build-your-kit, Categories, FAQ, How-it-works, Support, Policies
 */

import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('about page loads', async ({ page }) => {
    await page.goto('/about')
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact')
    await expect(page).toHaveURL(/\/contact/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('studios listing loads', async ({ page }) => {
    await page.goto('/studios')
    await expect(page).toHaveURL(/\/studios/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('build-your-kit page loads', async ({ page }) => {
    await page.goto('/build-your-kit')
    await expect(page).toHaveURL(/\/build-your-kit/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('categories page loads', async ({ page }) => {
    await page.goto('/categories')
    await expect(page).toHaveURL(/\/categories/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('FAQ page loads', async ({ page }) => {
    await page.goto('/faq')
    await expect(page).toHaveURL(/\/faq/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('how-it-works page loads', async ({ page }) => {
    await page.goto('/how-it-works')
    await expect(page).toHaveURL(/\/how-it-works/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('support page loads', async ({ page }) => {
    await page.goto('/support')
    await expect(page).toHaveURL(/\/support/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('policies page loads', async ({ page }) => {
    await page.goto('/policies')
    await expect(page).toHaveURL(/\/policies/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('packages page loads', async ({ page }) => {
    await page.goto('/packages')
    await expect(page).toHaveURL(/\/packages/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('compare page loads', async ({ page }) => {
    await page.goto('/compare')
    await expect(page).toHaveURL(/\/compare/)
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 })
  })
})
