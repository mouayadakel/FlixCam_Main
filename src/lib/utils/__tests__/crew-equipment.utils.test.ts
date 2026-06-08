import {
  getLocalizedCrewProfile,
  isQuoteOnlyCrew,
  resolveCrewBookingMode,
  QUOTE_ONLY_CREW_SKUS,
} from '../crew-equipment.utils'

describe('crew-equipment.utils', () => {
  it('marks DOP SKU as quote-only', () => {
    expect(resolveCrewBookingMode({}, 'CREW-DOP')).toBe('quote')
    expect(isQuoteOnlyCrew({ itemType: 'crew' }, 'CREW-DOP', 'crew')).toBe(true)
  })

  it('allows cart booking for focus puller', () => {
    expect(resolveCrewBookingMode({ itemType: 'crew', bookingMode: 'cart' }, 'CREW-1ST-AC')).toBe(
      'cart'
    )
    expect(isQuoteOnlyCrew({ itemType: 'crew' }, 'CREW-1ST-AC', 'crew')).toBe(false)
  })

  it('respects explicit bookingMode on customFields', () => {
    expect(resolveCrewBookingMode({ bookingMode: 'quote' }, 'CREW-GRIP')).toBe('quote')
  })

  it('localizes crew profile', () => {
    const profile = getLocalizedCrewProfile(
      {
        itemType: 'crew',
        crewProfile: {
          nameEn: 'Ali',
          nameAr: 'علي',
          bioEn: '10 years',
          bioAr: '١٠ سنوات',
          experienceYears: 10,
          specialties: ['Drama'],
        },
      },
      'ar'
    )
    expect(profile?.name).toBe('علي')
    expect(profile?.bio).toBe('١٠ سنوات')
  })

  it('exports senior quote SKUs', () => {
    expect(QUOTE_ONLY_CREW_SKUS).toContain('CREW-DOP')
    expect(QUOTE_ONLY_CREW_SKUS).toContain('CREW-CAM-OP')
  })
})
