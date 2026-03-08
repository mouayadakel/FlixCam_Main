/**
 * Translation Memory System
 * Maintains consistency and reuses translations across similar content
 */

interface TranslationMemoryEntry {
  source: string
  target: string
  sourceLocale: string
  targetLocale: string
  context?: string
  domain?: string
  confidence: number
  usageCount: number
  lastUsed: Date
  approved: boolean
}

interface TranslationSuggestion {
  text: string
  confidence: number
  source: 'memory' | 'ai' | 'glossary'
  metadata?: {
    similarPhrases?: string[]
    domain?: string
    context?: string
  }
}

class TranslationMemory {
  private static instance: TranslationMemory
  private memory: Map<string, TranslationMemoryEntry[]> = new Map()
  private glossary: Map<string, Record<string, string>> = new Map()
  private initialized = false

  static getInstance(): TranslationMemory {
    if (!TranslationMemory.instance) {
      TranslationMemory.instance = new TranslationMemory()
    }
    return TranslationMemory.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load existing translation memory
      await this.loadMemory()
      // Load glossary
      await this.loadGlossary()
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize translation memory:', error)
    }
  }

  /**
   * Get translation suggestions for a given text
   */
  async getSuggestions(
    text: string,
    sourceLocale: string,
    targetLocale: string,
    context?: string
  ): Promise<TranslationSuggestion[]> {
    await this.initialize()

    const suggestions: TranslationSuggestion[] = []

    // 1. Exact matches from memory
    const exactMatches = this.findExactMatches(text, sourceLocale, targetLocale)
    suggestions.push(
      ...exactMatches.map((entry) => ({
        text: entry.target,
        confidence: entry.confidence,
        source: 'memory' as const,
        metadata: {
          domain: entry.domain,
          context: entry.context,
          similarPhrases: this.findSimilarPhrases(text, sourceLocale),
        },
      }))
    )

    // 2. Fuzzy matches from memory
    const fuzzyMatches = this.findFuzzyMatches(text, sourceLocale, targetLocale, 0.8)
    suggestions.push(
      ...fuzzyMatches.map((entry) => ({
        text: entry.target,
        confidence: entry.confidence * 0.8, // Reduce confidence for fuzzy matches
        source: 'memory' as const,
        metadata: {
          domain: entry.domain,
          context: entry.context,
        },
      }))
    )

    // 3. Glossary matches
    const glossaryMatches = this.findGlossaryMatches(text, sourceLocale, targetLocale)
    suggestions.push(
      ...glossaryMatches.map((translation) => ({
        text: translation,
        confidence: 0.9,
        source: 'glossary' as const,
        metadata: {
          domain: 'terminology',
        },
      }))
    )

    // Sort by confidence and remove duplicates
    return this.deduplicateSuggestions(suggestions)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Return top 5 suggestions
  }

  /**
   * Add a new translation to memory
   */
  async addTranslation(
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string,
    context?: string,
    domain?: string,
    approved: boolean = false
  ): Promise<void> {
    await this.initialize()

    const key = this.generateMemoryKey(source, sourceLocale, targetLocale)
    const entries = this.memory.get(key) || []

    // Check if entry already exists
    const existingEntry = entries.find(
      (entry) => entry.target.toLowerCase() === target.toLowerCase()
    )

    if (existingEntry) {
      // Update existing entry
      existingEntry.usageCount++
      existingEntry.lastUsed = new Date()
      if (approved) {
        existingEntry.approved = true
        existingEntry.confidence = Math.min(1, existingEntry.confidence + 0.1)
      }
    } else {
      // Add new entry
      const newEntry: TranslationMemoryEntry = {
        source,
        target,
        sourceLocale,
        targetLocale,
        context,
        domain,
        confidence: approved ? 0.8 : 0.5,
        usageCount: 1,
        lastUsed: new Date(),
        approved,
      }

      entries.push(newEntry)
      this.memory.set(key, entries)
    }

    // Save to storage
    await this.saveMemory()
  }

  /**
   * Approve a translation (increases confidence)
   */
  async approveTranslation(
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<void> {
    await this.initialize()

    const key = this.generateMemoryKey(source, sourceLocale, targetLocale)
    const entries = this.memory.get(key) || []

    const entry = entries.find((entry) => entry.target.toLowerCase() === target.toLowerCase())

    if (entry) {
      entry.approved = true
      entry.confidence = Math.min(1, entry.confidence + 0.2)
      entry.lastUsed = new Date()
      await this.saveMemory()
    }
  }

  /**
   * Get translation statistics
   */
  getStatistics(): {
    totalEntries: number
    approvedEntries: number
    locales: string[]
    domains: string[]
    averageConfidence: number
  } {
    let totalEntries = 0
    let approvedEntries = 0
    let totalConfidence = 0
    const locales = new Set<string>()
    const domains = new Set<string>()

    for (const entries of this.memory.values()) {
      for (const entry of entries) {
        totalEntries++
        if (entry.approved) approvedEntries++
        totalConfidence += entry.confidence
        locales.add(entry.sourceLocale)
        locales.add(entry.targetLocale)
        if (entry.domain) domains.add(entry.domain)
      }
    }

    return {
      totalEntries,
      approvedEntries,
      locales: Array.from(locales),
      domains: Array.from(domains),
      averageConfidence: totalEntries > 0 ? totalConfidence / totalEntries : 0,
    }
  }

  /**
   * Export translation memory for backup
   */
  async exportMemory(): Promise<string> {
    await this.initialize()

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      statistics: this.getStatistics(),
      memory: Array.from(this.memory.entries()).map(([key, entries]) => ({
        key,
        entries,
      })),
      glossary: Array.from(this.glossary.entries()),
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import translation memory from backup
   */
  async importMemory(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data)

      if (importData.memory) {
        for (const { key, entries } of importData.memory) {
          this.memory.set(key, entries)
        }
      }

      if (importData.glossary) {
        for (const [term, translations] of importData.glossary) {
          this.glossary.set(term, translations)
        }
      }

      await this.saveMemory()
    } catch (error) {
      console.error('Failed to import translation memory:', error)
      throw new Error('Invalid import data format')
    }
  }

  // Private helper methods

  private generateMemoryKey(source: string, sourceLocale: string, targetLocale: string): string {
    // Normalize text for key generation
    const normalizedSource = source.toLowerCase().trim().replace(/\s+/g, ' ')
    return `${sourceLocale}-${targetLocale}-${normalizedSource}`
  }

  private findExactMatches(
    text: string,
    sourceLocale: string,
    targetLocale: string
  ): TranslationMemoryEntry[] {
    const key = this.generateMemoryKey(text, sourceLocale, targetLocale)
    return this.memory.get(key) || []
  }

  private findFuzzyMatches(
    text: string,
    sourceLocale: string,
    targetLocale: string,
    threshold: number
  ): TranslationMemoryEntry[] {
    const matches: TranslationMemoryEntry[] = []
    const normalizedText = text.toLowerCase().trim()

    // Search through all memory entries for the locale pair
    for (const [key, entries] of this.memory.entries()) {
      if (!key.startsWith(`${sourceLocale}-${targetLocale}-`)) continue

      for (const entry of entries) {
        const similarity = this.calculateSimilarity(normalizedText, entry.source.toLowerCase())
        if (similarity >= threshold) {
          matches.push({
            ...entry,
            confidence: entry.confidence * similarity,
          })
        }
      }
    }

    return matches
  }

  private findGlossaryMatches(text: string, sourceLocale: string, targetLocale: string): string[] {
    const matches: string[] = []
    const words = text.toLowerCase().split(/\s+/)

    for (const word of words) {
      const translations = this.glossary.get(word)
      if (translations && translations[targetLocale]) {
        matches.push(translations[targetLocale])
      }
    }

    return matches
  }

  private findSimilarPhrases(text: string, locale: string): string[] {
    const similar: string[] = []
    const normalizedText = text.toLowerCase()

    for (const [key, entries] of this.memory.entries()) {
      if (!key.startsWith(`${locale}-`)) continue

      for (const entry of entries) {
        const similarity = this.calculateSimilarity(normalizedText, entry.source.toLowerCase())
        if (similarity > 0.7 && similarity < 1.0) {
          similar.push(entry.source)
        }
      }
    }

    return similar.slice(0, 3) // Return top 3 similar phrases
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance based similarity
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    const distance = matrix[str2.length][str1.length]
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - distance / maxLength
  }

  private deduplicateSuggestions(suggestions: TranslationSuggestion[]): TranslationSuggestion[] {
    const seen = new Set<string>()
    return suggestions.filter((suggestion) => {
      const key = suggestion.text.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private async loadMemory(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const memoryPath = path.join(process.cwd(), 'data/translation-memory.json')
      const data = await fs.readFile(memoryPath, 'utf-8')
      const memoryData = JSON.parse(data)

      for (const [key, entries] of Object.entries(memoryData)) {
        this.memory.set(key, entries as TranslationMemoryEntry[])
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty memory
      console.log('Translation memory file not found, starting with empty memory')
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const memoryPath = path.join(process.cwd(), 'data/translation-memory.json')
      const memoryData: Record<string, TranslationMemoryEntry[]> = {}

      for (const [key, entries] of this.memory.entries()) {
        memoryData[key] = entries
      }

      await fs.writeFile(memoryPath, JSON.stringify(memoryData, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save translation memory:', error)
    }
  }

  private async loadGlossary(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const glossaryPath = path.join(process.cwd(), 'data/translation-glossary.json')
      const data = await fs.readFile(glossaryPath, 'utf-8')
      const glossaryData = JSON.parse(data)

      for (const [term, translations] of Object.entries(glossaryData)) {
        this.glossary.set(term, translations as Record<string, string>)
      }
    } catch (error) {
      // File doesn't exist, create default glossary
      await this.createDefaultGlossary()
    }
  }

  private async createDefaultGlossary(): Promise<void> {
    const defaultGlossary = {
      camera: {
        ar: 'كاميرا',
        en: 'camera',
        zh: '相机',
        fr: 'caméra',
      },
      studio: {
        ar: 'استوديو',
        en: 'studio',
        zh: '工作室',
        fr: 'studio',
      },
      equipment: {
        ar: 'معدات',
        en: 'equipment',
        zh: '设备',
        fr: 'équipement',
      },
      booking: {
        ar: 'حجز',
        en: 'booking',
        zh: '预订',
        fr: 'réservation',
      },
      professional: {
        ar: 'احترافي',
        en: 'professional',
        zh: '专业',
        fr: 'professionnel',
      },
    }

    for (const [term, translations] of Object.entries(defaultGlossary)) {
      this.glossary.set(term, translations)
    }

    await this.saveGlossary()
  }

  private async saveGlossary(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const glossaryPath = path.join(process.cwd(), 'data/translation-glossary.json')
      const glossaryData: Record<string, Record<string, string>> = {}

      for (const [term, translations] of this.glossary.entries()) {
        glossaryData[term] = translations
      }

      await fs.writeFile(glossaryPath, JSON.stringify(glossaryData, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save glossary:', error)
    }
  }
}

// Singleton instance
export const translationMemory = TranslationMemory.getInstance()

// React hook for translation memory
export function useTranslationMemory() {
  return {
    getSuggestions: translationMemory.getSuggestions.bind(translationMemory),
    addTranslation: translationMemory.addTranslation.bind(translationMemory),
    approveTranslation: translationMemory.approveTranslation.bind(translationMemory),
    getStatistics: translationMemory.getStatistics.bind(translationMemory),
    exportMemory: translationMemory.exportMemory.bind(translationMemory),
    importMemory: translationMemory.importMemory.bind(translationMemory),
  }
}
