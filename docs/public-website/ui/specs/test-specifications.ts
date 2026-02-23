#!/usr/bin/env tsx
// ============================================================================
// Test Script: Comprehensive Specifications Testing
// Purpose: Test specifications system on all equipment
// Usage: npm run test:specs or tsx scripts/test-specifications.ts
// ============================================================================

import { PrismaClient } from '@prisma/client'
import {
  isStructuredSpecifications,
  isFlatSpecifications,
  type StructuredSpecifications,
  type FlatSpecifications,
} from '../types/specifications'
import {
  convertFlatToStructured,
  validateSpecifications,
  extractHighlights,
  extractQuickSpecs,
} from '../lib/specifications-utils'

const prisma = new PrismaClient()

// ============================================================================
// Test Results Types
// ============================================================================

interface TestResults {
  timestamp: string
  summary: {
    total: number
    structured: number
    flat: number
    empty: number
    invalid: number
  }
  conversionTests: {
    attempted: number
    successful: number
    failed: ConversionFailure[]
  }
  validationTests: {
    tested: number
    passed: number
    failed: ValidationFailure[]
  }
  performanceMetrics: {
    avgConversionTime: number
    avgValidationTime: number
  }
  recommendations: string[]
}

interface ConversionFailure {
  id: string
  sku: string
  category: string
  error: string
  originalSpecs: any
}

interface ValidationFailure {
  id: string
  sku: string
  category: string
  errors: string[]
  specs: StructuredSpecifications
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function printHeader(text: string) {
  console.log('\n' + '='.repeat(80))
  console.log(text)
  console.log('='.repeat(80) + '\n')
}

function printSection(text: string) {
  console.log('\n' + '-'.repeat(80))
  console.log(text)
  console.log('-'.repeat(80))
}

// ============================================================================
// Main Test Function
// ============================================================================

async function runComprehensiveTests(): Promise<TestResults> {
  const startTime = Date.now()

  printHeader('🧪 Starting Comprehensive Specifications Tests')

  // Initialize results
  const results: TestResults = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      structured: 0,
      flat: 0,
      empty: 0,
      invalid: 0,
    },
    conversionTests: {
      attempted: 0,
      successful: 0,
      failed: [],
    },
    validationTests: {
      tested: 0,
      passed: 0,
      failed: [],
    },
    performanceMetrics: {
      avgConversionTime: 0,
      avgValidationTime: 0,
    },
    recommendations: [],
  }

  // Fetch all equipment
  printSection('📦 Fetching Equipment Data')
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })

  results.summary.total = equipment.length
  console.log(`✓ Found ${equipment.length} equipment items\n`)

  // Performance tracking
  const conversionTimes: number[] = []
  const validationTimes: number[] = []

  // Test each equipment item
  printSection('🔍 Analyzing Equipment Specifications')

  for (const item of equipment) {
    // Classify specification type
    if (!item.specifications) {
      results.summary.empty++
      continue
    }

    if (isStructuredSpecifications(item.specifications)) {
      results.summary.structured++

      // Validate structured specs
      const validationStart = Date.now()
      const validation = validateSpecifications(item.specifications as StructuredSpecifications)
      validationTimes.push(Date.now() - validationStart)

      results.validationTests.tested++

      if (validation.valid) {
        results.validationTests.passed++
      } else {
        results.validationTests.failed.push({
          id: item.id,
          sku: item.sku,
          category: item.category.name,
          errors: validation.errors,
          specs: item.specifications as StructuredSpecifications,
        })
      }
    } else if (isFlatSpecifications(item.specifications)) {
      results.summary.flat++
      results.conversionTests.attempted++

      // Test conversion
      try {
        const conversionStart = Date.now()
        const converted = convertFlatToStructured(item.specifications as FlatSpecifications, {
          categoryHint: item.category.name.toLowerCase(),
          autoFillDefaults: true,
        })
        conversionTimes.push(Date.now() - conversionStart)

        // Validate converted specs
        const validation = validateSpecifications(converted)

        if (validation.valid && converted.groups.length > 0) {
          results.conversionTests.successful++
        } else {
          results.conversionTests.failed.push({
            id: item.id,
            sku: item.sku,
            category: item.category.name,
            error: validation.valid
              ? 'Conversion resulted in empty groups'
              : validation.errors.join(', '),
            originalSpecs: item.specifications,
          })
        }
      } catch (error) {
        results.conversionTests.failed.push({
          id: item.id,
          sku: item.sku,
          category: item.category.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          originalSpecs: item.specifications,
        })
      }
    } else {
      results.summary.invalid++
    }
  }

  // Calculate performance metrics
  if (conversionTimes.length > 0) {
    results.performanceMetrics.avgConversionTime =
      conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
  }

  if (validationTimes.length > 0) {
    results.performanceMetrics.avgValidationTime =
      validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length
  }

  // Generate recommendations
  generateRecommendations(results)

  // Print results
  printResults(results, Date.now() - startTime)

  return results
}

// ============================================================================
// Generate Recommendations
// ============================================================================

function generateRecommendations(results: TestResults) {
  const { summary, conversionTests, validationTests } = results

  // No equipment
  if (summary.total === 0) {
    results.recommendations.push('⚠️  No equipment found in database')
    return
  }

  // Missing specifications
  if (summary.empty > 0) {
    const percentage = ((summary.empty / summary.total) * 100).toFixed(1)
    results.recommendations.push(
      `📝 ${summary.empty} equipment (${percentage}%) have no specifications - should be added`
    )
  }

  // Flat specifications that need conversion
  if (summary.flat > 0) {
    const percentage = ((summary.flat / summary.total) * 100).toFixed(1)
    const successRate =
      conversionTests.attempted > 0
        ? ((conversionTests.successful / conversionTests.attempted) * 100).toFixed(1)
        : '0'

    results.recommendations.push(
      `🔄 ${summary.flat} equipment (${percentage}%) use flat format - ` +
        `conversion success rate: ${successRate}%`
    )

    if (conversionTests.failed.length > 0) {
      results.recommendations.push(
        `❌ ${conversionTests.failed.length} flat conversions failed - ` + `manual review required`
      )
    }
  }

  // Invalid specifications
  if (summary.invalid > 0) {
    const percentage = ((summary.invalid / summary.total) * 100).toFixed(1)
    results.recommendations.push(
      `🚫 ${summary.invalid} equipment (${percentage}%) have invalid specification format`
    )
  }

  // Validation failures
  if (validationTests.failed.length > 0) {
    results.recommendations.push(
      `⚠️  ${validationTests.failed.length} structured specifications failed validation - ` +
        `data quality issues detected`
    )
  }

  // Performance concerns
  if (results.performanceMetrics.avgConversionTime > 100) {
    results.recommendations.push(
      `🐌 Average conversion time is ${formatDuration(results.performanceMetrics.avgConversionTime)} - ` +
        `consider optimization`
    )
  }

  // Success metrics
  const completePercentage = ((summary.structured / summary.total) * 100).toFixed(1)
  if (summary.structured === summary.total) {
    results.recommendations.push(
      `✅ All equipment (${summary.total}) have structured specifications - excellent!`
    )
  } else if (parseFloat(completePercentage) > 80) {
    results.recommendations.push(
      `👍 ${completePercentage}% of equipment have structured specifications - good coverage`
    )
  } else if (parseFloat(completePercentage) > 50) {
    results.recommendations.push(
      `⚡ ${completePercentage}% structured - consider bulk conversion to improve`
    )
  } else {
    results.recommendations.push(
      `🎯 Only ${completePercentage}% structured - bulk conversion recommended`
    )
  }
}

// ============================================================================
// Print Results
// ============================================================================

function printResults(results: TestResults, totalTime: number) {
  printHeader('📊 Test Results Summary')

  // Summary
  console.log('Equipment Summary:')
  console.log(`  Total Equipment:          ${results.summary.total}`)
  console.log(`  ✓ Structured:             ${results.summary.structured}`)
  console.log(`  ~ Flat (needs conversion): ${results.summary.flat}`)
  console.log(`  ∅ Empty (no specs):       ${results.summary.empty}`)
  console.log(`  ✗ Invalid:                ${results.summary.invalid}`)

  // Conversion Tests
  if (results.conversionTests.attempted > 0) {
    printSection('🔄 Conversion Tests')
    console.log(`  Attempted:  ${results.conversionTests.attempted}`)
    console.log(`  ✓ Success:  ${results.conversionTests.successful}`)
    console.log(`  ✗ Failed:   ${results.conversionTests.failed.length}`)

    if (results.conversionTests.attempted > 0) {
      const successRate = (
        (results.conversionTests.successful / results.conversionTests.attempted) *
        100
      ).toFixed(1)
      console.log(`  Success Rate: ${successRate}%`)
    }

    // Show failures
    if (results.conversionTests.failed.length > 0) {
      console.log('\n  Failed Conversions:')
      results.conversionTests.failed.slice(0, 5).forEach((failure, idx) => {
        console.log(`    ${idx + 1}. ${failure.sku} (${failure.category})`)
        console.log(`       Error: ${failure.error}`)
      })

      if (results.conversionTests.failed.length > 5) {
        console.log(`    ... and ${results.conversionTests.failed.length - 5} more`)
      }
    }
  }

  // Validation Tests
  if (results.validationTests.tested > 0) {
    printSection('✓ Validation Tests')
    console.log(`  Tested:   ${results.validationTests.tested}`)
    console.log(`  ✓ Passed: ${results.validationTests.passed}`)
    console.log(`  ✗ Failed: ${results.validationTests.failed.length}`)

    if (results.validationTests.tested > 0) {
      const passRate = (
        (results.validationTests.passed / results.validationTests.tested) *
        100
      ).toFixed(1)
      console.log(`  Pass Rate: ${passRate}%`)
    }

    // Show failures
    if (results.validationTests.failed.length > 0) {
      console.log('\n  Validation Failures:')
      results.validationTests.failed.slice(0, 5).forEach((failure, idx) => {
        console.log(`    ${idx + 1}. ${failure.sku} (${failure.category})`)
        failure.errors.forEach((err) => {
          console.log(`       - ${err}`)
        })
      })

      if (results.validationTests.failed.length > 5) {
        console.log(`    ... and ${results.validationTests.failed.length - 5} more`)
      }
    }
  }

  // Performance
  printSection('⚡ Performance Metrics')
  console.log(
    `  Avg Conversion Time: ${formatDuration(results.performanceMetrics.avgConversionTime)}`
  )
  console.log(
    `  Avg Validation Time: ${formatDuration(results.performanceMetrics.avgValidationTime)}`
  )
  console.log(`  Total Test Time:     ${formatDuration(totalTime)}`)

  // Recommendations
  if (results.recommendations.length > 0) {
    printSection('💡 Recommendations')
    results.recommendations.forEach((rec) => {
      console.log(`  ${rec}`)
    })
  }

  printHeader('✨ Tests Complete')
}

// ============================================================================
// Run Tests
// ============================================================================

runComprehensiveTests()
  .then((results) => {
    // Exit with error code if there are critical failures
    const hasCriticalFailures =
      results.summary.invalid > 0 ||
      results.conversionTests.failed.length > results.conversionTests.attempted * 0.2 ||
      results.validationTests.failed.length > results.validationTests.tested * 0.2

    process.exit(hasCriticalFailures ? 1 : 0)
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:')
    console.error(error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
