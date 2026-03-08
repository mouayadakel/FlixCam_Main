/**
 * Translation completeness checker.
 * Compares all language files against en.json (source of truth).
 * Exit code 1 if any gaps found — blocks build.
 *
 * Usage: npx tsx src/lib/utils/check-translations.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const MESSAGES_DIR = path.resolve(__dirname, '../../messages')
const SOURCE_LANG = 'en'
const TARGET_LANGS = ['ar', 'zh', 'fr']

/** Exported for testing */
export function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = String(value ?? '')
    }
  }
  return result
}

/** Exported for testing */
export function run(messagesDir = MESSAGES_DIR) {
  const sourcePath = path.join(messagesDir, `${SOURCE_LANG}.json`)
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`)
    process.exit(1)
  }

  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
  const sourceKeys = flattenObject(sourceData)
  const sourceKeyCount = Object.keys(sourceKeys).length

  let hasErrors = false

  console.log(`Source (${SOURCE_LANG}.json): ${sourceKeyCount} keys\n`)

  for (const lang of TARGET_LANGS) {
    const langPath = path.join(messagesDir, `${lang}.json`)
    if (!fs.existsSync(langPath)) {
      console.error(`Missing language file: ${langPath}`)
      hasErrors = true
      continue
    }

    const langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'))
    const langKeys = flattenObject(langData)

    const missing: string[] = []
    const empty: string[] = []
    const placeholders: string[] = []

    for (const key of Object.keys(sourceKeys)) {
      if (!(key in langKeys)) {
        missing.push(key)
      } else if (langKeys[key] === '') {
        empty.push(key)
      } else if (langKeys[key].includes('_NEEDED:')) {
        placeholders.push(key)
      }
    }

    const issues = missing.length + empty.length + placeholders.length
    const status = issues === 0 ? 'PASS' : 'FAIL'
    console.log(`${lang}.json: ${status} (${Object.keys(langKeys).length} keys)`)

    if (missing.length > 0) {
      console.log(`  Missing keys: ${missing.length}`)
      missing.slice(0, 5).forEach((k) => console.log(`    - ${k}`))
      if (missing.length > 5) console.log(`    ... and ${missing.length - 5} more`)
    }
    if (empty.length > 0) {
      console.log(`  Empty values: ${empty.length}`)
    }
    if (placeholders.length > 0) {
      console.log(`  Untranslated placeholders: ${placeholders.length}`)
      placeholders.slice(0, 5).forEach((k) => console.log(`    - ${k}: ${langKeys[k]}"`))
      if (placeholders.length > 5) console.log(`    ... and ${placeholders.length - 5} more`)
    }

    if (issues > 0) hasErrors = true
    console.log('')
  }

  if (hasErrors) {
    console.error('Translation check FAILED — fix all issues above before building.')
    process.exit(1)
  }

  console.log('All translations complete.')
  process.exit(0)
}

if (process.env.NODE_ENV !== 'test') {
  run()
}
