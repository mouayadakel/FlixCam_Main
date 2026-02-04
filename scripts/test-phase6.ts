/**
 * @file test-phase6.ts
 * @description Test script for Phase 6: Client Portal
 * @module scripts
 * @author Engineering Team
 * @created 2026-01-28
 */

import { existsSync } from 'fs'
import { join } from 'path'

const PORTAL_PAGES = [
  'src/app/portal/layout.tsx',
  'src/app/portal/dashboard/page.tsx',
  'src/app/portal/bookings/page.tsx',
  'src/app/portal/bookings/[id]/page.tsx',
  'src/app/portal/contracts/page.tsx',
  'src/app/portal/contracts/[id]/page.tsx',
  'src/app/portal/contracts/[id]/sign/page.tsx',
  'src/app/portal/invoices/page.tsx',
  'src/app/portal/invoices/[id]/page.tsx',
]

const API_ROUTES = [
  'src/app/api/contracts/[id]/route.ts',
  'src/app/api/contracts/[id]/sign/route.ts',
]

const REQUIRED_COMPONENTS = [
  'src/components/ui/card.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/label.tsx',
]

const REQUIRED_UTILS = [
  'src/lib/utils/format.utils.ts',
  'src/lib/db/prisma.ts',
  'src/lib/auth/auth-helpers.ts',
  'src/lib/services/contract.service.ts',
]

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function test(name: string, testFn: () => boolean | string): void {
  try {
    const result = testFn()
    if (result === true) {
      results.push({ name, passed: true })
      console.log(`  ✅ ${name}`)
    } else {
      results.push({ name, passed: false, error: result as string })
      console.log(`  ❌ ${name}: ${result}`)
    }
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message })
    console.log(`  ❌ ${name}: ${error.message}`)
  }
}

console.log('🧪 Testing Phase 6: Client Portal\n')

// Test 1: All portal pages exist
console.log('1. File Existence Tests:')
PORTAL_PAGES.forEach((file) => {
  test(`Portal page exists: ${file}`, () => {
    return existsSync(join(process.cwd(), file))
  })
})

API_ROUTES.forEach((file) => {
  test(`API route exists: ${file}`, () => {
    return existsSync(join(process.cwd(), file))
  })
})

// Test 2: Required components exist
console.log('\n2. Component Dependencies:')
REQUIRED_COMPONENTS.forEach((file) => {
  test(`Component exists: ${file}`, () => {
    return existsSync(join(process.cwd(), file))
  })
})

// Test 3: Required utilities exist
console.log('\n3. Utility Dependencies:')
REQUIRED_UTILS.forEach((file) => {
  test(`Utility exists: ${file}`, () => {
    return existsSync(join(process.cwd(), file))
  })
})

// Test 4: Check for react-signature-canvas
console.log('\n4. Dependencies Check:')
test('react-signature-canvas installed', () => {
  try {
    require('react-signature-canvas')
    return true
  } catch {
    return 'Package not found in node_modules'
  }
})

test('@types/react-signature-canvas installed', () => {
  try {
    require('@types/react-signature-canvas')
    return true
  } catch {
    return 'Types package not found'
  }
})

// Test 5: Verify portal structure
console.log('\n5. Portal Structure:')
test('Portal layout exists', () => {
  return existsSync(join(process.cwd(), 'src/app/portal/layout.tsx'))
})

test('Portal dashboard exists', () => {
  return existsSync(join(process.cwd(), 'src/app/portal/dashboard/page.tsx'))
})

test('Portal bookings directory exists', () => {
  return existsSync(join(process.cwd(), 'src/app/portal/bookings'))
})

test('Portal contracts directory exists', () => {
  return existsSync(join(process.cwd(), 'src/app/portal/contracts'))
})

test('Portal invoices directory exists', () => {
  return existsSync(join(process.cwd(), 'src/app/portal/invoices'))
})

// Test 6: API routes structure
console.log('\n6. API Routes Structure:')
test('Contracts API directory exists', () => {
  return existsSync(join(process.cwd(), 'src/app/api/contracts'))
})

test('Contract GET route exists', () => {
  return existsSync(join(process.cwd(), 'src/app/api/contracts/[id]/route.ts'))
})

test('Contract sign route exists', () => {
  return existsSync(
    join(process.cwd(), 'src/app/api/contracts/[id]/sign/route.ts')
  )
})

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 Test Summary:')
console.log('='.repeat(50))

const passed = results.filter((r) => r.passed).length
const failed = results.filter((r) => !r.passed).length
const total = results.length

console.log(`Total Tests: ${total}`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

if (failed > 0) {
  console.log('\n❌ Failed Tests:')
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
}

console.log('\n' + '='.repeat(50))

if (failed === 0) {
  console.log('✅ All Phase 6 structure tests passed!')
  console.log('\n⚠️  Note: This tests file structure and dependencies.')
  console.log('   Runtime testing requires:')
  console.log('   - Dev server running (npm run dev)')
  console.log('   - Database connection')
  console.log('   - Authentication setup')
  console.log('   - Manual browser testing')
  process.exit(0)
} else {
  console.log('❌ Some tests failed. Please fix the issues above.')
  process.exit(1)
}
