#!/usr/bin/env node
/**
 * Programmatic Lighthouse audit for key pages.
 * Thresholds: performance >= 85, accessibility >= 95, best-practices >= 90, SEO >= 95
 * Output: reports/lighthouse-{timestamp}.json
 * Exit 1 if any threshold fails.
 *
 * Run: node scripts/lighthouse-audit.js
 * Ensure app is running at BASE_URL (default http://localhost:3000)
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'

const THRESHOLDS = {
  performance: 0.85,
  accessibility: 0.95,
  'best-practices': 0.9,
  seo: 0.95,
}

async function fetchFirstBlogSlug() {
  try {
    const res = await fetch(`${BASE_URL}/blog`)
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/href="\/blog\/([a-z0-9-]+)"/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function main() {
  const chromeLauncher = await import('chrome-launcher')
  const lighthouse = (await import('lighthouse')).default

  let chrome
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] })
  } catch (err) {
    console.error('Failed to launch Chrome:', err.message)
    process.exit(1)
  }

  const urls = ['/', '/blog']
  const slug = await fetchFirstBlogSlug()
  if (slug) urls.push(`/blog/${slug}`)

  const results = []
  const table = []

  for (const urlPath of urls) {
    const url = `${BASE_URL}${urlPath}`
    process.stdout.write(`Auditing ${url}... `)
    try {
      const runnerResult = await lighthouse(url, {
        logLevel: 'error',
        output: 'json',
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      })
      const lhr = runnerResult.lhr
      const row = { url: urlPath, scores: {}, passed: true }
      for (const [cat, min] of Object.entries(THRESHOLDS)) {
        const score = lhr.categories[cat]?.score ?? null
        row.scores[cat] = score
        if (score !== null && score < min) row.passed = false
      }
      results.push({ url: urlPath, lhr, row })
      table.push(row)
      console.log(row.passed ? 'OK' : 'FAIL')
    } catch (err) {
      console.log('ERROR')
      results.push({ url: urlPath, error: err.message })
      table.push({ url: urlPath, error: err.message, passed: false })
    }
  }

  await chrome.kill()

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportsDir = path.join(ROOT, 'reports')
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `lighthouse-${timestamp}.json`)

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    thresholds: THRESHOLDS,
    results: results.map((r) => ({
      url: r.url,
      error: r.error,
      scores: r.row
        ? Object.fromEntries(
            Object.entries(r.row.scores || {}).map(([k, v]) => [k, v !== null ? Math.round(v * 100) : null])
          )
        : undefined,
      passed: r.row?.passed,
    })),
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\nReport: ${reportPath}`)

  const formatScore = (score) => (score === null || score === undefined ? 'N/A' : `${Math.round(score * 100)}`)

  console.log('\n--- Summary ---')
  console.log('URL'.padEnd(40) + 'Perf'.padStart(6) + 'A11y'.padStart(6) + 'BP'.padStart(6) + 'SEO'.padStart(6) + '  Status')
  console.log('-'.repeat(70))
  for (const r of table) {
    if (r.error) {
      console.log(`${r.url.padEnd(40)}${'ERROR'.padStart(30)}`)
    } else {
      const perf = formatScore(r.scores?.performance).padStart(6)
      const a11y = formatScore(r.scores?.accessibility).padStart(6)
      const bp = formatScore(r.scores?.['best-practices']).padStart(6)
      const seo = formatScore(r.scores?.seo).padStart(6)
      const status = r.passed ? 'PASS' : 'FAIL'
      console.log(`${r.url.padEnd(40)}${perf}${a11y}${bp}${seo}  ${status}`)
    }
  }

  const anyFailed = table.some((r) => !r.passed)
  if (anyFailed) {
    console.log('\nSome audits failed thresholds. Exit 1.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
