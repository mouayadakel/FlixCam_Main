#!/usr/bin/env node
/**
 * One-off: migrate public SSR pages from hardcoded t('ar') to request locale.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(process.cwd(), 'src/app/(public)')

function walk(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(p))
    else if (ent.name === 'page.tsx') out.push(p)
  }
  return out
}

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8')
  if (!src.includes("t('ar',")) continue

  if (!src.includes('getRequestLocale')) {
    src = src.replace(
      "import { t } from '@/lib/i18n/translate'",
      "import { t } from '@/lib/i18n/translate'\nimport { getRequestLocale } from '@/lib/i18n/request-locale'"
    )
  }

  if (src.includes('export const metadata: Metadata')) {
    src = src.replace(
      /export const metadata: Metadata = \{([\s\S]*?)\n\}/,
      (block, body) => {
        const localized = body.replace(/t\('ar',/g, 't(locale,')
        return `export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  return {${localized}
}`
      }
    )
  }

  src = src.replace(/t\('ar',/g, 't(locale,')

  if (!src.includes('const { locale') && src.includes('export default')) {
    src = src.replace(
      /export default async function (\w+)\([^)]*\) \{\n/,
      (m, name) => `${m}  const { locale } = await getRequestLocale()\n`
    )
    src = src.replace(
      /export default function (\w+)\([^)]*\) \{\n/,
      (m, name) => `export default async function ${name}() {\n  const { locale } = await getRequestLocale()\n`
    )
  }

  fs.writeFileSync(file, src)
  console.log('updated', path.relative(process.cwd(), file))
}
