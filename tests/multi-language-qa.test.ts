/**
 * Multi-Language Production QA Test Suite
 * Comprehensive testing for all multi-language features
 */

import { test, expect } from '@playwright/test'

test.describe('Multi-Language Production QA', () => {
  const locales = ['ar', 'en', 'zh', 'fr']

  test.beforeEach(async ({ page }) => {
    // Clear cookies for fresh start
    await page.context().clearCookies()
  })

  test.describe('Language Switching', () => {
    test('should switch languages and persist preference', async ({ page }) => {
      await page.goto('/')

      // Test switching to each locale
      for (const locale of locales) {
        await page.click('[data-testid="language-switcher"]')
        await page.click(`[data-testid="locale-${locale}"]`)

        // Wait for navigation
        await page.waitForLoadState('networkidle')

        // Check cookie is set
        const cookies = await page.context().cookies()
        const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
        expect(localeCookie?.value).toBe(locale)

        // Check URL if it has locale prefix
        const url = page.url()
        if (locale !== 'ar') {
          expect(url).toContain(`/${locale}`)
        }
      }
    })

    test('should maintain language preference across pages', async ({ page }) => {
      // Set locale to English
      await page.goto('/en')
      await page.waitForLoadState('networkidle')

      // Navigate to different pages
      await page.goto('/en/studios')
      await page.waitForLoadState('networkidle')

      // Check locale is maintained
      const cookies = await page.context().cookies()
      const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
      expect(localeCookie?.value).toBe('en')
    })

    test('should handle RTL/LTR switching correctly', async ({ page }) => {
      // Test Arabic (RTL)
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const html = page.locator('html')
      await expect(html).toHaveAttribute('dir', 'rtl')

      // Test English (LTR)
      await page.goto('/en')
      await page.waitForLoadState('networkidle')

      await expect(html).toHaveAttribute('dir', 'ltr')
    })
  })

  test.describe('Content Localization', () => {
    test('should display localized content correctly', async ({ page }) => {
      const localizedContent = {
        ar: { title: 'استوديوهات', buttonText: 'احجز الآن' },
        en: { title: 'Studios', buttonText: 'Book Now' },
        zh: { title: '工作室', buttonText: '立即预订' },
        fr: { title: 'Studios', buttonText: 'Réserver maintenant' },
      }

      for (const [locale, content] of Object.entries(localizedContent)) {
        await page.goto(`/${locale}`)
        await page.waitForLoadState('networkidle')

        // Check main heading
        const heading = page.locator('h1, h2').first()
        await expect(heading).toContainText(content.title)

        // Check button text
        const button = page.locator('button').filter({ hasText: content.buttonText }).first()
        await expect(button).toBeVisible()
      }
    })

    test('should fallback to Arabic for missing translations', async ({ page }) => {
      // Navigate to a page with potentially missing translations
      await page.goto('/fr/some-page-with-missing-translations')
      await page.waitForLoadState('networkidle')

      // Should not show raw translation keys
      await expect(page.locator('text=common.missingKey')).not.toBeVisible()
      await expect(page.locator('text=t("missing.key")')).not.toBeVisible()
    })
  })

  test.describe('Studio CMS Multi-Language', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/admin/login')
      await page.fill('[data-testid="email"]', 'admin@example.com')
      await page.fill('[data-testid="password"]', 'password')
      await page.click('[data-testid="login-button"]')
      await page.waitForURL('/admin/dashboard')
    })

    test('should allow editing studio translations', async ({ page }) => {
      // Navigate to studio edit page
      await page.goto('/admin/cms/studios/test-studio-id')
      await page.waitForLoadState('networkidle')

      // Click on Basic tab
      await page.click('[data-testid="basic-tab"]')

      // Test locale tabs
      const localeTabs = ['العربية', 'English', '中文']
      for (const tab of localeTabs) {
        await page.click(`text=${tab}`)

        // Check that locale fields are visible
        await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
        await expect(page.locator('[data-testid="description-input"]')).toBeVisible()
        await expect(page.locator('[data-testid="hero-tagline-input"]')).toBeVisible()
      }

      // Fill in English translation
      await page.click('text=English')
      await page.fill('[data-testid="name-input"]', 'Test Studio EN')
      await page.fill('[data-testid="description-input"]', 'Test Description EN')

      // Save
      await page.click('[data-testid="save-button"]')

      // Check success message
      await expect(page.locator('text=تم الحفظ بنجاح')).toBeVisible()
    })

    test('should validate required Arabic fields', async ({ page }) => {
      await page.goto('/admin/cms/studios/test-studio-id')
      await page.waitForLoadState('networkidle')

      await page.click('[data-testid="basic-tab"]')
      await page.click('text=العربية')

      // Clear Arabic name field
      await page.fill('[data-testid="name-input"]', '')

      // Try to save
      await page.click('[data-testid="save-button"]')

      // Should show validation error
      await expect(page.locator('text=اسم الاستوديو مطلوب')).toBeVisible()
    })
  })

  test.describe('Translation Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/admin/login')
      await page.fill('[data-testid="email"]', 'admin@example.com')
      await page.fill('[data-testid="password"]', 'password')
      await page.click('[data-testid="login-button"]')
      await page.waitForURL('/admin/dashboard')
    })

    test('should display translation statistics correctly', async ({ page }) => {
      await page.goto('/admin/translations')
      await page.waitForLoadState('networkidle')

      // Check statistics
      await expect(page.locator('text=Total Keys')).toBeVisible()
      await expect(page.locator('text=Arabic')).toBeVisible()
      await expect(page.locator('text=English')).toBeVisible()
      await expect(page.locator('text=Chinese')).toBeVisible()
      await expect(page.locator('text=French')).toBeVisible()

      // Check French coverage (should be ~75%)
      const frenchCoverage = page.locator('[data-testid="french-coverage"]')
      await expect(frenchCoverage).toContainText('75%')
    })

    test('should paginate translations correctly', async ({ page }) => {
      await page.goto('/admin/translations')
      await page.waitForLoadState('networkidle')

      // Check pagination controls
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible()
      await expect(page.locator('[data-testid="previous-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="next-button"]')).toBeVisible()

      // Check items per page selector
      await expect(page.locator('[data-testid="items-per-page"]')).toBeVisible()

      // Navigate to next page
      await page.click('[data-testid="next-button"]')
      await page.waitForLoadState('networkidle')

      // Check page number changed
      await expect(page.locator('[data-testid="current-page"]')).toContainText('2')
    })

    test('should filter translations correctly', async ({ page }) => {
      await page.goto('/admin/translations')
      await page.waitForLoadState('networkidle')

      // Filter by namespace
      await page.selectOption('[data-testid="namespace-filter"]', 'common')
      await page.waitForLoadState('networkidle')

      // Check results
      await expect(page.locator('[data-testid="translation-key"]')).toContainText('common.')

      // Filter by locale
      await page.selectOption('[data-testid="locale-filter"]', 'fr')
      await page.waitForLoadState('networkidle')

      // Check French translations are shown
      await expect(page.locator('[data-testid="french-translation"]')).toBeVisible()
    })

    test('should export translations', async ({ page }) => {
      await page.goto('/admin/translations')
      await page.waitForLoadState('networkidle')

      // Click export CSV
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="export-csv"]')
      const download = await downloadPromise

      // Check filename
      expect(download.suggestedFilename()).toContain('translations')
      expect(download.suggestedFilename()).toContain('.csv')
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels on language switcher', async ({ page }) => {
      await page.goto('/')

      const switcher = page.locator('[data-testid="language-switcher"]')
      await expect(switcher).toHaveAttribute('aria-label')
      await expect(switcher).toHaveAttribute('aria-haspopup', 'menu')
      await expect(switcher).toHaveAttribute('aria-expanded', 'false')

      // Open dropdown
      await switcher.click()
      await expect(switcher).toHaveAttribute('aria-expanded', 'true')

      // Check menu items
      const menuItems = page.locator('[role="menuitem"]')
      await expect(menuItems.first()).toHaveAttribute('aria-label')

      // Check current locale indication
      const currentLocale = page.locator('[role="menuitem"][aria-current="true"]')
      await expect(currentLocale).toBeVisible()
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/')

      // Focus language switcher
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="language-switcher"]')).toBeFocused()

      // Open with Enter
      await page.keyboard.press('Enter')

      // Navigate menu items
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[role="menuitem"]').first()).toBeFocused()

      // Select with Enter
      await page.keyboard.press('Enter')
      await page.waitForLoadState('networkidle')

      // Check locale changed
      const cookies = await page.context().cookies()
      const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
      expect(localeCookie?.value).not.toBe('ar')
    })
  })

  test.describe('Performance', () => {
    test('should load locale bundles lazily', async ({ page }) => {
      // Monitor network requests
      const requests: string[] = []
      page.on('request', (request) => {
        requests.push(request.url())
      })

      await page.goto('/en')
      await page.waitForLoadState('networkidle')

      // Should only load English locale initially
      const localeRequests = requests.filter((url) => url.includes('/messages/'))
      expect(localeRequests).toHaveLength(1)
      expect(localeRequests[0]).toContain('/messages/en.json')

      // Switch to French
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="locale-fr"]')
      await page.waitForLoadState('networkidle')

      // Should now load French locale
      const frenchRequests = requests.filter((url) => url.includes('/messages/fr.json'))
      expect(frenchRequests.length).toBeGreaterThan(0)
    })

    test('should have good Lighthouse scores', async ({ page }) => {
      // This would require integrating with Lighthouse
      // For now, just check basic performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming
        return {
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        }
      })

      expect(performanceMetrics.domContentLoaded).toBeLessThan(1000)
      expect(performanceMetrics.loadComplete).toBeLessThan(3000)
      expect(performanceMetrics.firstPaint).toBeLessThan(800)
    })
  })

  test.describe('SEO', () => {
    test('should have proper hreflang tags', async ({ page }) => {
      await page.goto('/en')
      await page.waitForLoadState('networkidle')

      const hreflangs = await page.locator('link[rel="alternate"][hreflang]').all()
      expect(hreflangs.length).toBeGreaterThan(0)

      // Check for Arabic, English, Chinese, French
      const expectedLocales = ['ar', 'en', 'zh', 'fr']
      for (const locale of expectedLocales) {
        const hreflang = page.locator(`link[rel="alternate"][hreflang="${locale}"]`)
        await expect(hreflang).toBeVisible()
        await expect(hreflang).toHaveAttribute('href')
      }
    })

    test('should have canonical URLs', async ({ page }) => {
      await page.goto('/en/studios')
      await page.waitForLoadState('networkidle')

      const canonical = page.locator('link[rel="canonical"]')
      await expect(canonical).toBeVisible()
      await expect(canonical).toHaveAttribute('href')
      expect(await canonical.getAttribute('href')).toContain('/en/studios')
    })

    test('should have localized meta descriptions', async ({ page }) => {
      const localizedMeta = {
        ar: 'استوديوهات الإنتاج السينمائي الاحترافية',
        en: 'Professional film production studios',
        zh: '专业电影制作工作室',
        fr: 'Studios de production cinématographique professionnelle',
      }

      for (const [locale, description] of Object.entries(localizedMeta)) {
        await page.goto(`/${locale}/studios`)
        await page.waitForLoadState('networkidle')

        const metaDesc = page.locator('meta[name="description"]')
        await expect(metaDesc).toHaveAttribute('content', description)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle missing locale gracefully', async ({ page }) => {
      // Navigate to non-existent locale
      await page.goto('/invalid-locale')
      await page.waitForLoadState('networkidle')

      // Should fallback to Arabic
      const cookies = await page.context().cookies()
      const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
      expect(localeCookie?.value).toBe('ar')

      // Should not show error page
      await expect(page.locator('text=404')).not.toBeVisible()
    })

    test('should handle translation loading errors', async ({ page }) => {
      // Mock failed translation load
      await page.route('**/messages/en.json', (route) => route.abort())

      await page.goto('/en')
      await page.waitForLoadState('networkidle')

      // Should fallback to Arabic
      const cookies = await page.context().cookies()
      const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
      expect(localeCookie?.value).toBe('ar')
    })
  })
})
