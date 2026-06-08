import { expandSearchQuery } from '../semantic-search.utils'

describe('expandSearchQuery', () => {
  it('should return empty array for empty inputs', () => {
    expect(expandSearchQuery('')).toEqual([])
    expect(expandSearchQuery(null as any)).toEqual([])
    expect(expandSearchQuery(undefined as any)).toEqual([])
  })

  it('should normalize Arabic diacritics and character variants', () => {
    // Test Alef variations: أ، إ، آ -> ا
    const resultsAlef = expandSearchQuery('أبوتشر')
    expect(resultsAlef).toContain('ابوتشر')
    expect(resultsAlef).toContain('aputure')

    // Test Teh Marbuta: ة -> ه
    const resultsTeh = expandSearchQuery('عدسة')
    expect(resultsTeh).toContain('عدسه')
    expect(resultsTeh).toContain('lens')

    // Test Yeh/Alef Maksura: ى -> ي
    const resultsYeh = expandSearchQuery('سونيى')
    expect(resultsYeh).toContain('سونيي')
  })

  it('should perform cross-language dictionary translations', () => {
    // English brand -> Arabic mapping
    const resultsSonyEn = expandSearchQuery('sony')
    expect(resultsSonyEn).toContain('sony')
    expect(resultsSonyEn).toContain('سوني')

    // Arabic brand -> English mapping
    const resultsSonyAr = expandSearchQuery('سوني')
    expect(resultsSonyAr).toContain('سوني')
    expect(resultsSonyAr).toContain('sony')

    // English category -> Arabic mapping
    const resultsLensEn = expandSearchQuery('lens')
    expect(resultsLensEn).toContain('lens')
    expect(resultsLensEn).toContain('عدسة')

    // Arabic category -> English mapping
    const resultsLensAr = expandSearchQuery('عدسة')
    expect(resultsLensAr).toContain('عدسة')
    expect(resultsLensAr).toContain('lens')
  })

  it('should process multi-word compound search terms', () => {
    const compoundResults = expandSearchQuery('Sony Lens')
    
    // Check main components
    expect(compoundResults).toContain('sony')
    expect(compoundResults).toContain('سوني')
    expect(compoundResults).toContain('lens')
    expect(compoundResults).toContain('عدسة')
    expect(compoundResults).toContain('sony lens')
  })
})
