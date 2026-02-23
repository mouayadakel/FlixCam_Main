/**
 * Audit Chinese translations - find missing keys compared to Arabic
 */

import * as fs from 'fs'
import * as path from 'path'

const messagesDir = path.join(__dirname, '../src/messages')
const arPath = path.join(messagesDir, 'ar.json')
const zhPath = path.join(messagesDir, 'zh.json')

interface NestedObject {
  [key: string]: string | NestedObject
}

function flattenKeys(obj: NestedObject, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'string') {
      keys.push(fullKey)
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value, fullKey))
    }
  }

  return keys
}

function getNested(obj: NestedObject, path: string): string | NestedObject | undefined {
  const parts = path.split('.')
  let current: string | NestedObject | undefined = obj

  for (const part of parts) {
    if (typeof current === 'object' && current !== null) {
      current = current[part]
    } else {
      return undefined
    }
  }

  return current
}

async function main() {
  const arContent = JSON.parse(fs.readFileSync(arPath, 'utf-8')) as NestedObject
  const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8')) as NestedObject

  const arKeys = flattenKeys(arContent)
  const zhKeys = flattenKeys(zhContent)

  const arKeySet = new Set(arKeys)
  const zhKeySet = new Set(zhKeys)

  const missingInZh = arKeys.filter((key) => !zhKeySet.has(key))
  const extraInZh = zhKeys.filter((key) => !arKeySet.has(key))

  console.log('=== Chinese Translation Audit ===\n')
  console.log(`Total Arabic keys: ${arKeys.length}`)
  console.log(`Total Chinese keys: ${zhKeys.length}`)
  console.log(`Missing in Chinese: ${missingInZh.length}`)
  console.log(`Extra in Chinese: ${extraInZh.length}`)
  console.log(`Completion: ${((zhKeys.length / arKeys.length) * 100).toFixed(1)}%\n`)

  if (missingInZh.length > 0) {
    console.log('=== Missing Keys in Chinese ===')

    // Group by top-level category
    const byCategory: Record<string, string[]> = {}

    for (const key of missingInZh) {
      const category = key.split('.')[0]
      if (!byCategory[category]) {
        byCategory[category] = []
      }
      byCategory[category].push(key)
    }

    // Sort categories by count
    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)

    for (const [category, keys] of sortedCategories) {
      console.log(`\n${category} (${keys.length} missing):`)
      for (const key of keys.slice(0, 10)) {
        const arValue = getNested(arContent, key)
        console.log(`  ${key}: "${arValue}"`)
      }
      if (keys.length > 10) {
        console.log(`  ... and ${keys.length - 10} more`)
      }
    }
  }

  if (extraInZh.length > 0) {
    console.log('\n=== Extra Keys in Chinese (not in Arabic) ===')
    for (const key of extraInZh.slice(0, 20)) {
      console.log(`  ${key}`)
    }
    if (extraInZh.length > 20) {
      console.log(`  ... and ${extraInZh.length - 20} more`)
    }
  }

  // Export missing keys for translation
  const missingData: Record<string, string> = {}
  for (const key of missingInZh) {
    const arValue = getNested(arContent, key)
    if (typeof arValue === 'string') {
      missingData[key] = arValue
    }
  }

  const outputPath = path.join(__dirname, 'missing-zh-keys.json')
  fs.writeFileSync(outputPath, JSON.stringify(missingData, null, 2))
  console.log(`\n✓ Missing keys exported to: ${outputPath}`)
}

main().catch(console.error)
