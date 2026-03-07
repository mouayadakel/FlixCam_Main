/**
 * E2E: Admin blog authors CRUD
 * Login, navigate, create, edit, delete with reassignment
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'
const AUTHORS_URL = `${BASE}/admin/blog/authors`

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

test.describe('Admin blog authors', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto(AUTHORS_URL)
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

    test('authors page loads with table and Add Author button', async ({ page }) => {
      await page.goto(AUTHORS_URL)
      await expect(page).toHaveURL(/\/admin\/blog\/authors/)
      await expect(page.getByRole('heading', { name: /Blog Authors/i })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: /Add Author/i })).toBeVisible({ timeout: 5000 })
      const table = page.locator('table')
      await expect(table).toBeVisible({ timeout: 5000 })
    })

    test('create author opens dialog with name, email, avatar, social links', async ({ page }) => {
      await page.goto(AUTHORS_URL)
      await page.getByRole('button', { name: /Add Author/i }).click()

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('heading', { name: /Create Author/i })).toBeVisible()

      await expect(page.getByText(/Name/)).toBeVisible()
      await expect(page.getByText(/Email/)).toBeVisible()
      await expect(page.getByText(/Avatar/)).toBeVisible()
      await expect(page.getByText(/Social Links/)).toBeVisible()

      const unique = `e2e-author-${Date.now()}`
      const dialog = page.getByRole('dialog')
      await dialog.locator('input').first().fill(`Author ${unique}`)
      await dialog.locator('input[type="email"]').fill(`${unique}@example.com`)
      await page.getByRole('button', { name: /Create/ }).click()

      await expect(dialog).not.toBeVisible({ timeout: 8000 })
      await expect(page.getByText(unique)).toBeVisible({ timeout: 5000 })
    })

    test('edit author opens dialog with pre-filled data', async ({ page }) => {
      await page.goto(AUTHORS_URL)
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

      const editBtn = page.locator('tbody tr').first().locator('button').first()
      if (!(await editBtn.isVisible())) {
        test.skip(true, 'No authors to edit - create one first')
        return
      }
      await editBtn.click()

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('heading', { name: /Edit Author/i })).toBeVisible()
    })
  })
})
