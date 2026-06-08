/**
 * Compare two Flix Stock-style inventory XLSX files (multi-sheet, Barcode per row).
 *
 * Usage:
 *   npx tsx scripts/compare-inventory-xlsx.ts <master.xlsx> <update.xlsx>
 *
 * Output:
 *   - Sheets present only in master or only in update
 *   - Per shared sheet: new barcodes, removed barcodes, and field changes
 *
 * Matching is by Barcode (trimmed string). Rows without a barcode are skipped.
 */

import * as fs from 'fs'
import * as path from 'path'
import XLSX from '@e965/xlsx'

const COMPARE_FIELDS = [
  'Name',
  'Barcode',
  'Quantity ',
  'WITB',
  'Sales Price',
  'Currency',
  'Activity State',
  'Discription ',
  'Product Category',
  'Quantity On Hand',
  'Last Updated on',
] as const

function normSheetName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findBarcodeKey(row: Record<string, unknown>): string | null {
  for (const k of Object.keys(row)) {
    if (k.trim().toLowerCase() === 'barcode') {
      return k
    }
  }
  return null
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) {
    return ''
  }
  if (v instanceof Date) {
    return v.toISOString()
  }
  return String(v).trim()
}

function rowMapFromSheet(
  sheet: XLSX.WorkSheet
): { map: Map<string, Record<string, unknown>>; barcodeKey: string | null } {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })
  const map = new Map<string, Record<string, unknown>>()
  let barcodeKey: string | null = null
  for (const row of rows) {
    if (!barcodeKey) {
      barcodeKey = findBarcodeKey(row)
    }
    const k = barcodeKey ?? findBarcodeKey(row)
    if (!k) {
      continue
    }
    const bc = cellStr(row[k])
    if (!bc) {
      continue
    }
    map.set(bc, row)
  }
  return { map, barcodeKey }
}

function sheetIndexByNormName(names: string[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const n of names) {
    m.set(normSheetName(n), n)
  }
  return m
}

function diffRow(
  master: Record<string, unknown>,
  update: Record<string, unknown>
): Array<{ field: string; before: string; after: string }> {
  const out: Array<{ field: string; before: string; after: string }> = []
  for (const field of COMPARE_FIELDS) {
    const a = cellStr(master[field])
    const b = cellStr(update[field])
    if (a !== b) {
      out.push({ field, before: a, after: b })
    }
  }
  return out
}

function main(): void {
  const masterPath = process.argv[2]
  const updatePath = process.argv[3]
  if (!masterPath || !updatePath) {
    console.error(
      'Usage: npx tsx scripts/compare-inventory-xlsx.ts <master.xlsx> <update.xlsx>'
    )
    process.exit(1)
  }
  if (!fs.existsSync(masterPath)) {
    console.error(`Master file not found: ${masterPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(updatePath)) {
    console.error(`Update file not found: ${updatePath}`)
    process.exit(1)
  }

  const wbM = XLSX.readFile(masterPath, { cellDates: true })
  const wbU = XLSX.readFile(updatePath, { cellDates: true })

  const idxM = sheetIndexByNormName(wbM.SheetNames)
  const idxU = sheetIndexByNormName(wbU.SheetNames)

  const onlyMaster: string[] = []
  const onlyUpdate: string[] = []
  for (const [norm, orig] of idxM) {
    if (!idxU.has(norm)) {
      onlyMaster.push(orig)
    }
  }
  for (const [norm, orig] of idxU) {
    if (!idxM.has(norm)) {
      onlyUpdate.push(orig)
    }
  }

  console.log('=== Inventory XLSX comparison ===')
  console.log(`Master: ${path.resolve(masterPath)}`)
  console.log(`Update: ${path.resolve(updatePath)}`)
  console.log('')

  if (onlyMaster.length) {
    console.log('Sheets only in MASTER (missing from update file):')
    onlyMaster.forEach((s) => console.log(`  - ${s}`))
    console.log('')
  }
  if (onlyUpdate.length) {
    console.log('Sheets only in UPDATE (new sheets, not in master):')
    onlyUpdate.forEach((s) => console.log(`  + ${s}`))
    console.log('')
  }

  const sharedNorms = [...idxM.keys()].filter((n) => idxU.has(n))

  let totalNew = 0
  let totalRemoved = 0
  let totalChanged = 0

  for (const norm of sharedNorms.sort()) {
    const nameM = idxM.get(norm)!
    const nameU = idxU.get(norm)!
    const sheetM = wbM.Sheets[nameM]
    const sheetU = wbU.Sheets[nameU]
    const { map: mapM } = rowMapFromSheet(sheetM)
    const { map: mapU } = rowMapFromSheet(sheetU)

    const newInUpdate: string[] = []
    const missingFromUpdate: string[] = []
    const changes: Array<{ barcode: string; diffs: ReturnType<typeof diffRow> }> = []

    for (const bc of mapU.keys()) {
      if (!mapM.has(bc)) {
        newInUpdate.push(bc)
      }
    }
    for (const bc of mapM.keys()) {
      if (!mapU.has(bc)) {
        missingFromUpdate.push(bc)
      }
    }
    for (const bc of mapM.keys()) {
      if (!mapU.has(bc)) {
        continue
      }
      const d = diffRow(mapM.get(bc)!, mapU.get(bc)!)
      if (d.length) {
        changes.push({ barcode: bc, diffs: d })
      }
    }

    totalNew += newInUpdate.length
    totalRemoved += missingFromUpdate.length
    totalChanged += changes.length

    const hasActivity =
      newInUpdate.length > 0 ||
      missingFromUpdate.length > 0 ||
      changes.length > 0

    if (!hasActivity) {
      continue
    }

    console.log(`--- Sheet: "${nameM}" ↔ "${nameU}" ---`)
    console.log(`    Rows with barcode — master: ${mapM.size}, update: ${mapU.size}`)

    if (newInUpdate.length) {
      console.log(`    NEW in update (not in master) — ${newInUpdate.length} barcode(s):`)
      for (const bc of newInUpdate.sort()) {
        const row = mapU.get(bc)!
        const nm = cellStr(row.Name ?? row['Name'])
        console.log(`      + ${bc}  ${nm ? `— ${nm}` : ''}`)
      }
    }
    if (missingFromUpdate.length) {
      console.log(
        `    MISSING from update (in master only) — ${missingFromUpdate.length} barcode(s):`
      )
      for (const bc of missingFromUpdate.sort()) {
        const row = mapM.get(bc)!
        const nm = cellStr(row.Name ?? row['Name'])
        console.log(`      − ${bc}  ${nm ? `— ${nm}` : ''}`)
      }
    }
    if (changes.length) {
      console.log(`    CHANGED rows — ${changes.length} barcode(s):`)
      for (const { barcode, diffs } of changes.sort((a, b) =>
        a.barcode.localeCompare(b.barcode)
      )) {
        console.log(`      * ${barcode}`)
        for (const { field, before, after } of diffs) {
          const short = (s: string) => (s.length > 80 ? `${s.slice(0, 77)}...` : s)
          console.log(`          ${field}: "${short(before)}" → "${short(after)}"`)
        }
      }
    }
    console.log('')
  }

  console.log('=== Summary (shared sheets only) ===')
  console.log(`  New barcodes in update:     ${totalNew}`)
  console.log(`  Barcodes only in master:    ${totalRemoved}`)
  console.log(`  Barcodes with field diffs:  ${totalChanged}`)
}

main()
