/**
 * Playwright config for E2E tests (Phase 8.3).
 * Run: npx playwright test
 */

import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'

/** CI database URL – uses root role (created by scripts/postgres-ci-init.sql) in .github/workflows/ci.yml */
const CI_DATABASE_URL = 'postgresql://root:root@localhost:5432/ci?schema=public'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: process.env.CI
    ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ],
  webServer:
    process.env.CI
      ? {
          command: 'bash scripts/ci-e2e-server.sh',
          url: baseURL,
          timeout: 180000,
          reuseExistingServer: false,
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL || CI_DATABASE_URL,
          },
        }
      : {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
})
