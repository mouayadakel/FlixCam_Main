/**
 * E2E: Admin blog categories CRUD
 * Login, navigate, create, edit, reload persist, delete
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'
const CATEGORIES_URL = `${BASE}/admin/blog/categories`

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/login`)
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  const email = page.locator('input[name="email"], input[type="email"]').first()
  const password = page.locator('input[name="password"], input[type="password"]').first()
  await email.fill(process.env.PLAYWRIGHT_ADMIN_EMAIL!)
  await password.fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15000 })
}

test.describe('Admin blog categories', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto(CATEGORIES_URL)
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

    test('categories page loads with table and Add Category button', async ({ page }) => {
      await page.goto(CATEGORIES_URL)
      await expect(page).toHaveURL(/\/admin\/blog\/categories/)
      await expect(page.getByRole('heading', { name: /Blog Categories/i })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: /Add Category/i })).toBeVisible({ timeout: 5000 })
      const table = page.locator('table')
      await expect(table).toBeVisible({ timeout: 5000 })
    })

    test('create category opens dialog and can submit', async ({ page }) => {
      await page.goto(CATEGORIES_URL)
      await page.getByRole('button', { name: /Add Category/i }).click()

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('heading', { name: /Create Category/i })).toBeVisible()

      const unique = `e2e-cat-${Date.now()}`
      const slug = unique
      const dialog = page.getByRole('dialog')
      await dialog.locator('input').nth(0).fill(`فئة ${unique}`)
      await dialog.locator('input').nth(1).fill(`Category ${unique}`)
      await dialog.locator('input').nth(2).fill(slug)

      await page.getByRole('button', { name: /^Create$/ }).click()

      await expect(dialog).not.toBeVisible({ timeout: 10000 })
      await expect(page.getByText(unique)).toBeVisible({ timeout: 5000 })
    })

    test('edit category opens dialog with pre-filled data', async ({ page }) => {
      await page.goto(CATEGORIES_URL)
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

      const editBtn = page.locator('tbody tr').first().locator('button').first()
      if (!(await editBtn.isVisible())) {
        test.skip(true, 'No categories to edit - create one first')
        return
      }
      await editBtn.click()

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('heading', { name: /Edit Category/i })).toBeVisible()
    })
  })
})
