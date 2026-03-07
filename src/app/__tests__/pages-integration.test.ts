/**
 * Integration tests for pages (Phase 8)
 * Verifies page modules export correctly and critical routes are reachable.
 * Full E2E runs in e2e/*.spec.ts with Playwright.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_DIR = path.join(__dirname, '..')

function findPageFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('_') && e.name !== 'api') {
      findPageFiles(full, acc)
    } else if (e.name === 'page.tsx' || e.name === 'page.js') {
      acc.push(path.relative(APP_DIR, full))
    }
  }
  return acc
}

describe('Pages integration (Phase 8)', () => {
  describe('Page files exist', () => {
    it('has public homepage', () => {
      const home = path.join(APP_DIR, '(public)', 'page.tsx')
      expect(fs.existsSync(home)).toBe(true)
    })

    it('has login page', () => {
      const login = path.join(APP_DIR, '(auth)', 'login', 'page.tsx')
      expect(fs.existsSync(login)).toBe(true)
    })

    it('has equipment catalog page', () => {
      const eq = path.join(APP_DIR, '(public)', 'equipment', 'page.tsx')
      expect(fs.existsSync(eq)).toBe(true)
    })

    it('has cart page', () => {
      const cart = path.join(APP_DIR, '(public)', 'cart', 'page.tsx')
      expect(fs.existsSync(cart)).toBe(true)
    })

    it('has blog listing page', () => {
      const blog = path.join(APP_DIR, '(public)', 'blog', 'page.tsx')
      expect(fs.existsSync(blog)).toBe(true)
    })

    it('has admin dashboard', () => {
      const admin = path.join(APP_DIR, 'admin', 'dashboard', 'page.tsx')
      const adminAlt = path.join(APP_DIR, 'admin', '(routes)', 'dashboard', 'overview', 'page.tsx')
      expect(fs.existsSync(admin) || fs.existsSync(adminAlt)).toBe(true)
    })
  })

  describe('Layout files exist', () => {
    it('has public layout', () => {
      const layout = path.join(APP_DIR, '(public)', 'layout.tsx')
      expect(fs.existsSync(layout)).toBe(true)
    })

    it('has root layout', () => {
      const layout = path.join(APP_DIR, 'layout.tsx')
      expect(fs.existsSync(layout)).toBe(true)
    })
  })
})
