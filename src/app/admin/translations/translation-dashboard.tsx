'use client'

/**
 * Translation Dashboard Component
 * Displays all translation keys with filtering and editing capabilities
 */

import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Upload, Search, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Import translation files
import arTranslations from '@/messages/ar.json'
import enTranslations from '@/messages/en.json'
import zhTranslations from '@/messages/zh.json'

type Locale = 'ar' | 'en' | 'zh'
type TranslationKey = string
type TranslationValue = string | Record<string, any>

interface FlatTranslation {
  key: string
  ar: string
  en: string
  zh: string
  namespace: string
  missing: Locale[]
}

function flattenTranslations(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenTranslations(value, newKey))
    } else {
      result[newKey] = String(value)
    }
  }

  return result
}

function getNamespace(key: string): string {
  return key.split('.')[0] || 'root'
}

export function TranslationDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocale, setSelectedLocale] = useState<Locale | 'all'>('all')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all')
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Flatten all translations
  const flatAr = useMemo(() => flattenTranslations(arTranslations), [])
  const flatEn = useMemo(() => flattenTranslations(enTranslations), [])
  const flatZh = useMemo(() => flattenTranslations(zhTranslations), [])

  // Get all unique keys
  const allKeys = useMemo(() => {
    const keys = new Set([...Object.keys(flatAr), ...Object.keys(flatEn), ...Object.keys(flatZh)])
    return Array.from(keys).sort()
  }, [flatAr, flatEn, flatZh])

  // Build flat translations array
  const translations: FlatTranslation[] = useMemo(() => {
    return allKeys.map((key) => {
      const missing: Locale[] = []
      if (!flatAr[key]) missing.push('ar')
      if (!flatEn[key]) missing.push('en')
      if (!flatZh[key]) missing.push('zh')

      return {
        key,
        ar: flatAr[key] || '',
        en: flatEn[key] || '',
        zh: flatZh[key] || '',
        namespace: getNamespace(key),
        missing,
      }
    })
  }, [allKeys, flatAr, flatEn, flatZh])

  // Get unique namespaces
  const namespaces = useMemo(() => {
    const ns = new Set(translations.map((t) => t.namespace))
    return Array.from(ns).sort()
  }, [translations])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedNamespace, selectedLocale, showMissingOnly])

  // Filter translations
  const filteredTranslations = useMemo(() => {
    return translations.filter((t) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !t.key.toLowerCase().includes(query) &&
          !t.ar.toLowerCase().includes(query) &&
          !t.en.toLowerCase().includes(query) &&
          !t.zh.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Namespace filter
      if (selectedNamespace !== 'all' && t.namespace !== selectedNamespace) {
        return false
      }

      // Locale filter
      if (selectedLocale !== 'all' && t.missing.includes(selectedLocale)) {
        return false
      }

      // Missing only filter
      if (showMissingOnly && t.missing.length === 0) {
        return false
      }

      return true
    })
  }, [translations, searchQuery, selectedNamespace, selectedLocale, showMissingOnly])

  // Pagination calculations
  const totalPages = Math.ceil(filteredTranslations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTranslations = filteredTranslations.slice(startIndex, endIndex)

  // Statistics
  const stats = useMemo(() => {
    const total = translations.length
    const arComplete = translations.filter((t) => !t.missing.includes('ar')).length
    const enComplete = translations.filter((t) => !t.missing.includes('en')).length
    const zhComplete = translations.filter((t) => !t.missing.includes('zh')).length
    const fullyTranslated = translations.filter((t) => t.missing.length === 0).length

    return {
      total,
      arComplete,
      enComplete,
      zhComplete,
      fullyTranslated,
      arPercent: Math.round((arComplete / total) * 100),
      enPercent: Math.round((enComplete / total) * 100),
      zhPercent: Math.round((zhComplete / total) * 100),
    }
  }, [translations])

  const handleExportCSV = () => {
    const csv = [
      ['Key', 'Namespace', 'Arabic', 'English', 'Chinese', 'Missing'].join(','),
      ...filteredTranslations.map((t) =>
        [
          t.key,
          t.namespace,
          `"${t.ar.replace(/"/g, '""')}"`,
          `"${t.en.replace(/"/g, '""')}"`,
          `"${t.zh.replace(/"/g, '""')}"`,
          t.missing.join(';'),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(
      {
        exported: new Date().toISOString(),
        stats,
        translations: filteredTranslations,
      },
      null,
      2
    )

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translations-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Keys</div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Arabic</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.arPercent}%</span>
            <span className="text-sm text-muted-foreground">
              {stats.arComplete}/{stats.total}
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">English</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.enPercent}%</span>
            <span className="text-sm text-muted-foreground">
              {stats.enComplete}/{stats.total}
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Chinese</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.zhPercent}%</span>
            <span className="text-sm text-muted-foreground">
              {stats.zhComplete}/{stats.total}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search translations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Namespace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Namespaces</SelectItem>
            {namespaces.map((ns) => (
              <SelectItem key={ns} value={ns}>
                {ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocale} onValueChange={(v) => setSelectedLocale(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Locale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locales</SelectItem>
            <SelectItem value="ar">Arabic</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showMissingOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMissingOnly(!showMissingOnly)}
        >
          <Filter className="me-2 h-4 w-4" />
          Missing Only
        </Button>

        <Select
          value={String(itemsPerPage)}
          onValueChange={(v) => {
            setItemsPerPage(Number(v))
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
            <SelectItem value="200">200 per page</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="me-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="me-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredTranslations.length)} of{' '}
        {filteredTranslations.length} translations
        {filteredTranslations.length !== translations.length &&
          ` (filtered from ${translations.length} total)`}
      </div>

      {/* Translations Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-start text-sm font-medium">Key</th>
                <th className="p-3 text-start text-sm font-medium">Arabic</th>
                <th className="p-3 text-start text-sm font-medium">English</th>
                <th className="p-3 text-start text-sm font-medium">Chinese</th>
                <th className="p-3 text-start text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTranslations.map((t, idx) => (
                <tr key={t.key} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                  <td className="p-3 font-mono text-sm">
                    <div className="max-w-[200px] truncate" title={t.key}>
                      {t.key}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.namespace}</div>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="max-w-[250px] truncate" title={t.ar}>
                      {t.ar || <span className="italic text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="max-w-[250px] truncate" title={t.en}>
                      {t.en || <span className="italic text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="max-w-[250px] truncate" title={t.zh}>
                      {t.zh || <span className="italic text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    {t.missing.length === 0 ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Missing: {t.missing.join(', ')}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
