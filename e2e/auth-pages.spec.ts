/**
 * E2E: Auth pages (Phase 8)
 * Login, Register, Forgot password, Verify email
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Auth pages', () => {
  test('login page loads with form and passes WCAG accessibility', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 })
    await expect(passwordInput.first()).toBeVisible({ timeout: 5000 })

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('register page loads and passes WCAG accessibility', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveURL(/\/register/)
    
    // Check for core fields
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('.PhoneInput input')).toBeVisible() // Phone field
    await expect(page.locator('input[name="password"]')).toBeVisible()
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('register flow shows OTP tab after submission', async ({ page }) => {
    await page.goto('/register')
    
    // Fill out the form
    await page.fill('input[name="email"]', `e2e_${Date.now()}@example.com`)
    await page.fill('.PhoneInput input', '5550109999')
    await page.fill('input[name="password"]', 'Password123!')
    await page.fill('input[name="confirmPassword"]', 'Password123!')
    
    // Click submit
    await page.click('button[type="submit"]')
    
    // Verify OTP tab appears
    await expect(page.locator('text=Verify Phone')).toBeVisible({ timeout: 10000 })
  })

  test('forgot-password page loads with phone input and passes WCAG accessibility', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page).toHaveURL(/\/forgot-password/)
    const content = page.locator('form, [role="main"], main, body')
    await expect(content.first()).toBeVisible({ timeout: 5000 })

    // ForgotPasswordForm: phone is default, should show PhoneInput
    const phoneInput = page.locator('#forgot-phone, .PhoneInput input')
    await expect(phoneInput.first()).toBeVisible({ timeout: 5000 })

    // Submit button for sending OTP
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn.first()).toBeVisible()

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
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
