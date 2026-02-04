/**
 * @file verify-all-phases.ts
 * @description Comprehensive verification script for all implementation phases
 * @module scripts
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface PhaseCheck {
  phase: string
  status: 'complete' | 'partial' | 'missing'
  details: string[]
  files: string[]
}

const projectRoot = join(process.cwd())
const srcPath = join(projectRoot, 'src')
const docsPath = join(projectRoot, 'docs')
const prismaPath = join(projectRoot, 'prisma')

const checks: PhaseCheck[] = []

// Helper function to check if file/directory exists
function exists(path: string): boolean {
  return existsSync(join(projectRoot, path))
}

// Helper function to list files in directory
function listFiles(dir: string): string[] {
  try {
    if (!existsSync(dir)) return []
    return readdirSync(dir)
  } catch {
    return []
  }
}

// Helper function to check if directory has files
function hasFiles(dir: string, minFiles: number = 1): boolean {
  const files = listFiles(dir)
  return files.length >= minFiles
}

console.log('🔍 Verifying All Implementation Phases...\n')
console.log('=' .repeat(60))

// ============================================
// Phase 1: Technical Foundation
// ============================================
console.log('\n📋 Phase 1: Technical Foundation')
const phase1: PhaseCheck = {
  phase: 'Phase 1: Technical Foundation',
  status: 'complete',
  details: [],
  files: [],
}

// Check Next.js setup
if (exists('package.json')) phase1.files.push('package.json')
if (exists('tsconfig.json')) phase1.files.push('tsconfig.json')
if (exists('tailwind.config.ts')) phase1.files.push('tailwind.config.ts')
if (exists('next.config.js')) phase1.files.push('next.config.js')

// Check code quality
if (exists('.eslintrc.json')) phase1.files.push('.eslintrc.json')
if (exists('.prettierrc')) phase1.files.push('.prettierrc')

// Check UI components
if (hasFiles(join(srcPath, 'components', 'ui'), 5)) {
  phase1.details.push('UI components present')
} else {
  phase1.status = 'partial'
  phase1.details.push('UI components missing or incomplete')
}

// Check database
if (exists('prisma/schema.prisma')) phase1.files.push('prisma/schema.prisma')
if (exists('prisma/seed.ts')) phase1.files.push('prisma/seed.ts')

// Check authentication
if (exists('src/lib/auth/config.ts')) phase1.files.push('src/lib/auth/config.ts')
if (exists('src/app/(auth)/login/page.tsx')) phase1.files.push('src/app/(auth)/login/page.tsx')

// Check RBAC
if (exists('src/lib/auth/permissions.ts')) phase1.files.push('src/lib/auth/permissions.ts')
if (exists('src/lib/policies/base.policy.ts')) phase1.files.push('src/lib/policies/base.policy.ts')

// Check services
if (exists('src/lib/services/audit.service.ts')) phase1.files.push('src/lib/services/audit.service.ts')
if (exists('src/lib/events/event-bus.ts')) phase1.files.push('src/lib/events/event-bus.ts')

if (phase1.files.length >= 10) {
  phase1.details.push(`✅ ${phase1.files.length} core files verified`)
} else {
  phase1.status = 'partial'
  phase1.details.push(`⚠️ Only ${phase1.files.length} core files found`)
}

checks.push(phase1)

// ============================================
// Phase 2: Admin Control Panel
// ============================================
console.log('\n📋 Phase 2: Admin Control Panel')
const phase2: PhaseCheck = {
  phase: 'Phase 2: Admin Control Panel',
  status: 'complete',
  details: [],
  files: [],
}

// Check admin layout
if (exists('src/app/admin/(layout)/layout.tsx')) phase2.files.push('Admin layout')
if (exists('src/components/layouts/admin-sidebar.tsx')) phase2.files.push('Admin sidebar')
if (exists('src/components/layouts/admin-header.tsx')) phase2.files.push('Admin header')
if (exists('src/components/layouts/context-sidebar.tsx')) phase2.files.push('Context sidebar')
if (exists('src/components/layouts/mobile-nav.tsx')) phase2.files.push('Mobile nav')

// Check admin pages
if (exists('src/app/admin/(routes)/dashboard/page.tsx')) phase2.files.push('Dashboard page')
if (exists('src/app/admin/(routes)/settings/features/page.tsx')) phase2.files.push('Feature flags page')
if (exists('src/app/admin/(routes)/settings/integrations/page.tsx')) phase2.files.push('Integrations page')
if (exists('src/app/admin/(routes)/super/page.tsx')) phase2.files.push('Super admin page')

// Check feature flags API
if (exists('src/app/api/feature-flags/route.ts')) phase2.files.push('Feature flags API')
if (exists('src/app/api/feature-flags/[id]/request-approval/route.ts')) phase2.files.push('Approval request API')

// Check audit trail
if (exists('src/app/api/audit-logs/route.ts')) phase2.files.push('Audit logs API')
if (exists('src/components/admin/audit-trail-viewer.tsx')) phase2.files.push('Audit trail viewer')

// Check integrations
if (exists('src/app/api/integrations/route.ts')) phase2.files.push('Integrations API')
if (exists('src/lib/services/integration-config.service.ts')) phase2.files.push('Integration config service')

// Check super admin
if (exists('src/app/api/admin/health/route.ts')) phase2.files.push('Health check API')
if (exists('src/app/api/admin/jobs/rerun/route.ts')) phase2.files.push('Job rerun API')
if (exists('src/app/api/admin/locks/release/route.ts')) phase2.files.push('Lock release API')
if (exists('src/lib/middleware/read-only.middleware.ts')) phase2.files.push('Read-only middleware')

if (phase2.files.length >= 15) {
  phase2.details.push(`✅ ${phase2.files.length} admin components verified`)
} else {
  phase2.status = 'partial'
  phase2.details.push(`⚠️ Only ${phase2.files.length} admin components found`)
}

checks.push(phase2)

// ============================================
// Phase 3: Core Business Services
// ============================================
console.log('\n📋 Phase 3: Core Business Services')
const phase3: PhaseCheck = {
  phase: 'Phase 3: Core Business Services',
  status: 'complete',
  details: [],
  files: [],
}

// Check core services
const services = [
  'equipment.service.ts',
  'booking.service.ts',
  'payment.service.ts',
  'contract.service.ts',
  'studio.service.ts',
  'pricing.service.ts',
  'inspection.service.ts',
  'notification.service.ts',
  'approval.service.ts',
]

services.forEach((service) => {
  if (exists(`src/lib/services/${service}`)) {
    phase3.files.push(service.replace('.service.ts', ''))
  }
})

// Check policies
if (exists('src/lib/policies/equipment.policy.ts')) phase3.files.push('Equipment policy')
if (exists('src/lib/policies/booking.policy.ts')) phase3.files.push('Booking policy')

// Check validators
if (exists('src/lib/validators/equipment.validator.ts')) phase3.files.push('Equipment validator')

if (phase3.files.length >= 8) {
  phase3.details.push(`✅ ${phase3.files.length} services verified`)
} else {
  phase3.status = 'partial'
  phase3.details.push(`⚠️ Only ${phase3.files.length} services found`)
}

checks.push(phase3)

// ============================================
// Phase 4: Static Assets
// ============================================
console.log('\n📋 Phase 4: Static Assets')
const phase4: PhaseCheck = {
  phase: 'Phase 4: Static Assets',
  status: 'partial',
  details: [],
  files: [],
}

// Check public directory structure
if (exists('public')) {
  phase4.files.push('public/ directory')
  
  if (exists('public/images')) phase4.files.push('images/')
  if (exists('public/fonts')) phase4.files.push('fonts/')
  if (exists('public/files')) phase4.files.push('files/')
  
  if (phase4.files.length >= 3) {
    phase4.status = 'complete'
    phase4.details.push('✅ Public directory structure complete')
  } else {
    phase4.details.push('⚠️ Some public subdirectories missing')
  }
} else {
  phase4.details.push('❌ public/ directory missing')
}

checks.push(phase4)

// ============================================
// Phase 5: Documentation Structure
// ============================================
console.log('\n📋 Phase 5: Documentation Structure')
const phase5: PhaseCheck = {
  phase: 'Phase 5: Documentation Structure',
  status: 'complete',
  details: [],
  files: [],
}

// Check root documentation
const rootDocs = [
  'docs/00-README-DOCS.md',
  'docs/PRD.md',
  'docs/ARCHITECTURE.md',
  'docs/ROLES_AND_SECURITY.md',
  'docs/AI_BLUEPRINT.md',
  'docs/DATA_EVENTS.md',
  'docs/BOOKING_ENGINE.md',
]

rootDocs.forEach((doc) => {
  if (exists(doc)) {
    phase5.files.push(doc.replace('docs/', ''))
  }
})

// Check planning structure
if (hasFiles(join(docsPath, 'planning'), 5)) {
  phase5.files.push('planning/ directory')
  phase5.details.push('✅ Planning documents present')
}

// Check feature docs structure
if (exists('docs/features')) {
  phase5.files.push('features/ directory')
}

// Check shared docs structure
if (exists('docs/shared')) {
  phase5.files.push('shared/ directory')
}

if (phase5.files.length >= 8) {
  phase5.details.push(`✅ ${phase5.files.length} documentation files verified`)
} else {
  phase5.status = 'partial'
  phase5.details.push(`⚠️ Only ${phase5.files.length} documentation files found`)
}

checks.push(phase5)

// ============================================
// Phase 6: Testing Structure
// ============================================
console.log('\n📋 Phase 6: Testing Structure')
const phase6: PhaseCheck = {
  phase: 'Phase 6: Testing Structure',
  status: 'partial',
  details: [],
  files: [],
}

// Check tests directory
if (exists('tests')) {
  phase6.files.push('tests/ directory')
  
  if (exists('tests/unit')) phase6.files.push('tests/unit/')
  if (exists('tests/integration')) phase6.files.push('tests/integration/')
  
  if (phase6.files.length >= 2) {
    phase6.details.push('✅ Test directory structure present')
  } else {
    phase6.details.push('⚠️ Test directories incomplete')
  }
} else {
  phase6.details.push('⚠️ tests/ directory not found (may be planned for later)')
}

checks.push(phase6)

// ============================================
// Summary Report
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n📊 VERIFICATION SUMMARY\n')

let completeCount = 0
let partialCount = 0
let missingCount = 0

checks.forEach((check) => {
  const icon = check.status === 'complete' ? '✅' : check.status === 'partial' ? '⚠️' : '❌'
  console.log(`${icon} ${check.phase}: ${check.status.toUpperCase()}`)
  
  if (check.details.length > 0) {
    check.details.forEach((detail) => {
      console.log(`   ${detail}`)
    })
  }
  
  if (check.files.length > 0 && check.files.length <= 10) {
    console.log(`   Files: ${check.files.join(', ')}`)
  } else if (check.files.length > 10) {
    console.log(`   Files: ${check.files.length} files verified`)
  }
  
  console.log()
  
  if (check.status === 'complete') completeCount++
  else if (check.status === 'partial') partialCount++
  else missingCount++
})

console.log('='.repeat(60))
console.log('\n📈 OVERALL STATUS\n')
console.log(`✅ Complete: ${completeCount} phases`)
console.log(`⚠️  Partial:  ${partialCount} phases`)
console.log(`❌ Missing:  ${missingCount} phases`)
console.log(`📦 Total:    ${checks.length} phases\n`)

// Check for status files
console.log('📄 Status Files:')
const statusFiles = [
  'PHASE1_STATUS.md',
  'PHASE2_COMPLETE.md',
  'PHASE3_COMPLETE.md',
  'PHASE5_COMPLETE.md',
]

statusFiles.forEach((file) => {
  if (exists(file)) {
    console.log(`   ✅ ${file}`)
  } else {
    console.log(`   ❌ ${file} (missing)`)
  }
})

console.log('\n' + '='.repeat(60))

// Final verdict
const allComplete = checks.every((check) => check.status === 'complete')
const mostlyComplete = completeCount >= checks.length - 1

if (allComplete) {
  console.log('\n🎉 ALL PHASES COMPLETE!')
  process.exit(0)
} else if (mostlyComplete) {
  console.log('\n✨ MOSTLY COMPLETE - Minor items remaining')
  process.exit(0)
} else {
  console.log('\n⚠️  SOME PHASES NEED ATTENTION')
  process.exit(1)
}
