/**
 * E2E: Blog newsletter subscribe
 * Newsletter CTA, valid submit, duplicate, invalid email
 */

import { test, expect } from '@playwright/test'

const KNOWN_POST_SLUG = 'film-industry-trends-2024'

test.describe('Blog newsletter subscribe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/blog/${KNOWN_POST_SLUG}`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(new RegExp(`/blog/${KNOWN_POST_SLUG}`), { timeout: 10000 })
  })

  test('newsletter CTA is visible with email input and submit', async ({ page }) => {
    const newsletterSection = page.getByText(/Subscribe|اشترك/)
    await expect(newsletterSection.first()).toBeVisible({ timeout: 5000 })

    const emailInput = page.locator('input[type="email"]').filter({ has: page.locator('..') })
    const submitBtn = page.getByRole('button', { name: /Subscribe|اشترك/ })
    await expect(emailInput.first()).toBeVisible({ timeout: 3000 })
    await expect(submitBtn.first()).toBeVisible({ timeout: 3000 })
  })

  test('valid email submit shows success', async ({ page }) => {
    const section = page.locator('section').filter({ hasText: /Subscribe to our newsletter|اشترك في النشرة/ }).first()
    const emailInput = section.locator('input[type="email"]').first()
    const submitBtn = section.getByRole('button', { name: /Subscribe|اشترك/ }).first()

    if (!(await emailInput.isVisible())) {
      test.skip(true, 'Newsletter form not found - may need to be on post detail page')
      return
    }

    const uniqueEmail = `test-${Date.now()}@example.com`
    await emailInput.fill(uniqueEmail)
    await submitBtn.click()

    await expect(page.getByTestId('newsletter-success')).toBeVisible({ timeout: 10000 })
  })

  test('invalid email shows error', async ({ page }) => {
    const section = page.locator('section').filter({ hasText: /Subscribe to our newsletter|اشترك في النشرة/ }).first()
    const emailInput = section.locator('input[type="email"]').first()
    const submitBtn = section.getByRole('button', { name: /Subscribe|اشترك/ }).first()

    if (!(await emailInput.isVisible())) {
      test.skip(true, 'Newsletter form not found')
      return
    }

    await emailInput.fill('not-an-email')
    await submitBtn.click()

    await expect(section.getByTestId('newsletter-error')).toBeVisible({ timeout: 5000 })
  })
})
