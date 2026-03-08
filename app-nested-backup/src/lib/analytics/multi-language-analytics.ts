/**
 * Multi-Language Performance Analytics
 * Track locale usage, performance metrics, and translation coverage
 */

interface LocaleMetrics {
  locale: string
  usage: number
  pageViews: number
  avgLoadTime: number
  bounceRate: number
  conversionRate: number
  errorRate: number
  cacheHitRate: number
}

interface TranslationCoverage {
  locale: string
  totalKeys: number
  translatedKeys: number
  coverage: number
  missingKeys: string[]
  lastUpdated: Date
}

interface PerformanceMetrics {
  bundleSize: Record<string, number>
  loadTimes: Record<string, number>
  cachePerformance: Record<string, number>
  apiResponseTimes: Record<string, number>
}

class MultiLanguageAnalytics {
  private static instance: MultiLanguageAnalytics
  private metrics: Map<string, LocaleMetrics> = new Map()
  private performanceData: PerformanceMetrics = {
    bundleSize: {},
    loadTimes: {},
    cachePerformance: {},
    apiResponseTimes: {},
  }

  static getInstance(): MultiLanguageAnalytics {
    if (!MultiLanguageAnalytics.instance) {
      MultiLanguageAnalytics.instance = new MultiLanguageAnalytics()
    }
    return MultiLanguageAnalytics.instance
  }

  // Track locale usage
  trackLocaleUsage(locale: string, page: string): void {
    const existing = this.metrics.get(locale) || {
      locale,
      usage: 0,
      pageViews: 0,
      avgLoadTime: 0,
      bounceRate: 0,
      conversionRate: 0,
      errorRate: 0,
      cacheHitRate: 0,
    }

    existing.usage++
    existing.pageViews++

    this.metrics.set(locale, existing)

    // Send to analytics service
    this.sendToAnalytics('locale_usage', {
      locale,
      page,
      timestamp: new Date().toISOString(),
    })
  }

  // Track performance metrics
  trackLoadTime(locale: string, loadTime: number): void {
    const existing = this.metrics.get(locale)
    if (existing) {
      // Update average load time
      existing.avgLoadTime = (existing.avgLoadTime + loadTime) / 2
      this.metrics.set(locale, existing)
    }

    this.performanceData.loadTimes[locale] = loadTime

    this.sendToAnalytics('performance', {
      locale,
      loadTime,
      timestamp: new Date().toISOString(),
    })
  }

  // Track cache performance
  trackCacheHit(locale: string, hit: boolean): void {
    const existing = this.metrics.get(locale)
    if (existing) {
      // Update cache hit rate
      const totalRequests = existing.usage
      const hits = Math.floor((existing.cacheHitRate * totalRequests) / 100) + (hit ? 1 : 0)
      existing.cacheHitRate = (hits / totalRequests) * 100
      this.metrics.set(locale, existing)
    }

    this.sendToAnalytics('cache_performance', {
      locale,
      hit,
      timestamp: new Date().toISOString(),
    })
  }

  // Track translation errors
  trackTranslationError(locale: string, key: string, error: string): void {
    const existing = this.metrics.get(locale)
    if (existing) {
      // Update error rate
      existing.errorRate = ((existing.errorRate + 1) / existing.usage) * 100
      this.metrics.set(locale, existing)
    }

    this.sendToAnalytics('translation_error', {
      locale,
      key,
      error,
      timestamp: new Date().toISOString(),
    })
  }

  // Track language switching
  trackLanguageSwitch(fromLocale: string, toLocale: string): void {
    this.sendToAnalytics('language_switch', {
      from: fromLocale,
      to: toLocale,
      timestamp: new Date().toISOString(),
    })
  }

  // Track bundle size
  trackBundleSize(locale: string, size: number): void {
    this.performanceData.bundleSize[locale] = size

    this.sendToAnalytics('bundle_size', {
      locale,
      size,
      timestamp: new Date().toISOString(),
    })
  }

  // Get analytics summary
  getAnalyticsSummary(): {
    localeMetrics: LocaleMetrics[]
    performanceMetrics: PerformanceMetrics
    totalUsage: number
    mostPopularLocale: string
    averageLoadTime: number
  } {
    const localeMetrics = Array.from(this.metrics.values())
    const totalUsage = localeMetrics.reduce((sum, m) => sum + m.usage, 0)
    const mostPopularLocale =
      localeMetrics.reduce((max, m) => (m.usage > max.usage ? m : max), localeMetrics[0])?.locale ||
      'ar'
    const averageLoadTime =
      localeMetrics.reduce((sum, m) => sum + m.avgLoadTime, 0) / localeMetrics.length

    return {
      localeMetrics,
      performanceMetrics: this.performanceData,
      totalUsage,
      mostPopularLocale,
      averageLoadTime,
    }
  }

  // Get translation coverage
  async getTranslationCoverage(): Promise<TranslationCoverage[]> {
    const locales = ['ar', 'en', 'zh', 'fr']
    const coverage: TranslationCoverage[] = []

    for (const locale of locales) {
      try {
        const translations = await import(`@/messages/${locale}.json`)
        const flatKeys = this.flattenObject(translations.default)
        const totalKeys = Object.keys(flatKeys).length
        const translatedKeys = Object.values(flatKeys).filter((v) => v && v !== '').length
        const missingKeys = Object.entries(flatKeys)
          .filter(([_, value]) => !value || value === '')
          .map(([key]) => key)

        coverage.push({
          locale,
          totalKeys,
          translatedKeys,
          coverage: (translatedKeys / totalKeys) * 100,
          missingKeys,
          lastUpdated: new Date(),
        })
      } catch (error) {
        console.error(`Failed to load translations for ${locale}:`, error)
      }
    }

    return coverage
  }

  // Generate performance report
  generatePerformanceReport(): {
    summary: string
    recommendations: string[]
    metrics: any
  } {
    const summary = this.getAnalyticsSummary()
    const recommendations: string[] = []

    // Analyze performance and generate recommendations
    if (summary.averageLoadTime > 2000) {
      recommendations.push('Consider optimizing bundle sizes for slower locales')
    }

    const slowestLocale = Object.entries(summary.performanceMetrics.loadTimes).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0]
    if (slowestLocale && summary.performanceMetrics.loadTimes[slowestLocale] > 3000) {
      recommendations.push(
        `${slowestLocale} has slow load times - consider lazy loading optimization`
      )
    }

    const leastUsedLocale = summary.localeMetrics.sort((a, b) => a.usage - b.usage)[0]?.locale
    if (
      leastUsedLocale &&
      summary.localeMetrics.find((m) => m.locale === leastUsedLocale)?.usage! < 100
    ) {
      recommendations.push(
        `${leastUsedLocale} has low usage - consider improving content or marketing`
      )
    }

    const lowCoverage = summary.localeMetrics.find((m) => m.errorRate > 5)
    if (lowCoverage) {
      recommendations.push(`${lowCoverage.locale} has high error rate - check translation quality`)
    }

    return {
      summary: `Total usage: ${summary.totalUsage}, Most popular: ${summary.mostPopularLocale}, Avg load time: ${summary.averageLoadTime}ms`,
      recommendations,
      metrics: summary,
    }
  }

  // Export analytics data
  exportData(format: 'json' | 'csv'): string {
    const data = this.getAnalyticsSummary()

    if (format === 'json') {
      return JSON.stringify(data, null, 2)
    }

    // CSV format
    const headers = [
      'Locale',
      'Usage',
      'Page Views',
      'Avg Load Time',
      'Bounce Rate',
      'Conversion Rate',
      'Error Rate',
      'Cache Hit Rate',
    ]
    const rows = data.localeMetrics.map((m) => [
      m.locale,
      m.usage.toString(),
      m.pageViews.toString(),
      m.avgLoadTime.toString(),
      m.bounceRate.toString(),
      m.conversionRate.toString(),
      m.errorRate.toString(),
      m.cacheHitRate.toString(),
    ])

    return [headers, ...rows].map((row) => row.join(',')).join('\n')
  }

  // Private helper methods
  private sendToAnalytics(event: string, data: any): void {
    // In production, send to analytics service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      ;(window as any).gtag('event', event, data)
    }

    // Also log to console for debugging
    console.log(`Analytics: ${event}`, data)
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey))
        } else {
          flattened[newKey] = obj[key]
        }
      }
    }
    return flattened
  }
}

// Singleton instance
export const multiLanguageAnalytics = MultiLanguageAnalytics.getInstance()

// React hook for analytics
export function useMultiLanguageAnalytics() {
  return {
    trackLocaleUsage: multiLanguageAnalytics.trackLocaleUsage.bind(multiLanguageAnalytics),
    trackLoadTime: multiLanguageAnalytics.trackLoadTime.bind(multiLanguageAnalytics),
    trackCacheHit: multiLanguageAnalytics.trackCacheHit.bind(multiLanguageAnalytics),
    trackTranslationError:
      multiLanguageAnalytics.trackTranslationError.bind(multiLanguageAnalytics),
    trackLanguageSwitch: multiLanguageAnalytics.trackLanguageSwitch.bind(multiLanguageAnalytics),
    trackBundleSize: multiLanguageAnalytics.trackBundleSize.bind(multiLanguageAnalytics),
    getAnalyticsSummary: multiLanguageAnalytics.getAnalyticsSummary.bind(multiLanguageAnalytics),
    getTranslationCoverage:
      multiLanguageAnalytics.getTranslationCoverage.bind(multiLanguageAnalytics),
    generatePerformanceReport:
      multiLanguageAnalytics.generatePerformanceReport.bind(multiLanguageAnalytics),
    exportData: multiLanguageAnalytics.exportData.bind(multiLanguageAnalytics),
  }
}
