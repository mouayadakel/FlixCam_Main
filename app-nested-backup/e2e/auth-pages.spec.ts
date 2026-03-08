/**
 * E2E: Auth pages (Phase 8)
 * Login, Register, Forgot password, Verify email
 */

import { test, expect } from '@playwright/test'

test.describe('Auth pages', () => {
  test('login page loads with form', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 })
    await expect(passwordInput.first()).toBeVisible({ timeout: 5000 })
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveURL(/\/register/)
    const form = page.locator('form, [role="main"], main')
    await expect(form.first()).toBeVisible({ timeout: 5000 })
  })

  test('forgot-password page loads', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page).toHaveURL(/\/forgot-password/)
    const content = page.locator('form, [role="main"], main, body')
    await expect(content.first()).toBeVisible({ timeout: 5000 })
  })

  test('verify-email page loads', async ({ page }) => {
    await page.goto('/verify-email')
    await expect(page).toHaveURL(/\/verify-email/)
    const content = page.locator('form, [role="main"], main, body')
    await expect(content.first()).toBeVisible({ timeout: 5000 })
  })

  test('reset-password page loads (with token param)', async ({ page }) => {
    await page.goto('/reset-password?token=test-token')
    await expect(page).toHaveURL(/\/reset-password/)
    const content = page.locator('form, [role="main"], main, body')
    await expect(content.first()).toBeVisible({ timeout: 5000 })
  })
})
