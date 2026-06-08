import {
  assertMoyasarCheckoutChargeHalalah,
  assertValidMoyasarAmountHalalah,
  coerceMoyasarAmountHalalah,
  moyasarHalalahToSar,
  sarToMoyasarHalalah,
} from '../moyasar-amount'

describe('moyasar-amount', () => {
  it('sarToMoyasarHalalah: 15 SAR → 1500 halalah', () => {
    expect(sarToMoyasarHalalah(15)).toBe(1500)
  })

  it('sarToMoyasarHalalah: 1.5 SAR → 150 halalah', () => {
    expect(sarToMoyasarHalalah(1.5)).toBe(150)
  })

  it('sarToMoyasarHalalah: uses trunc toward zero (e.g. 10.005 → 1000 halalah)', () => {
    expect(sarToMoyasarHalalah(10.005)).toBe(1000)
  })

  it('sarToMoyasarHalalah: 828 / 17 / 1 SAR (mental checks)', () => {
    expect(sarToMoyasarHalalah(828)).toBe(82800)
    expect(sarToMoyasarHalalah(17)).toBe(1700)
    expect(sarToMoyasarHalalah(1)).toBe(100)
  })

  it('sarToMoyasarHalalah: negative or non-finite → 0', () => {
    expect(sarToMoyasarHalalah(-1)).toBe(0)
    expect(sarToMoyasarHalalah(Number.NaN)).toBe(0)
  })

  it('moyasarHalalahToSar: 1500 → 15 SAR', () => {
    expect(moyasarHalalahToSar(1500)).toBe(15)
  })

  it('moyasarHalalahToSar: 100 → 1 SAR', () => {
    expect(moyasarHalalahToSar(100)).toBe(1)
  })

  it('moyasarHalalahToSar: 50 → 0.5 SAR', () => {
    expect(moyasarHalalahToSar(50)).toBe(0.5)
  })

  describe('assertValidMoyasarAmountHalalah', () => {
    it('accepts positive integer halalah (100, 1500, or string "1500")', () => {
      expect(() => assertValidMoyasarAmountHalalah(100)).not.toThrow()
      expect(() => assertValidMoyasarAmountHalalah(1500)).not.toThrow()
      expect(() => assertValidMoyasarAmountHalalah(' 1500 ')).not.toThrow()
    })

    it('rejects zero, negative, non-integer, NaN', () => {
      expect(() => assertValidMoyasarAmountHalalah(0)).toThrow(/Invalid Moyasar amount/)
      expect(() => assertValidMoyasarAmountHalalah(-1)).toThrow(/Invalid Moyasar amount/)
      expect(() => assertValidMoyasarAmountHalalah(1.5)).toThrow(/Invalid Moyasar amount/)
      expect(() => assertValidMoyasarAmountHalalah(Number.NaN)).toThrow(/Invalid Moyasar amount/)
    })
  })

  describe('coerceMoyasarAmountHalalah', () => {
    it('converts string/number inputs into integer halalah', () => {
      expect(coerceMoyasarAmountHalalah('1700')).toBe(1700)
      expect(coerceMoyasarAmountHalalah(82800)).toBe(82800)
      expect(coerceMoyasarAmountHalalah('1700.99')).toBe(1700)
    })

    it('throws the explicit safety error for empty/invalid values', () => {
      expect(() => coerceMoyasarAmountHalalah(0)).toThrow('Invalid payment amount: 0')
      expect(() => coerceMoyasarAmountHalalah('')).toThrow('Invalid payment amount: ')
      expect(() => coerceMoyasarAmountHalalah('abc')).toThrow('Invalid payment amount: abc')
    })
  })

  describe('assertMoyasarCheckoutChargeHalalah', () => {
    it('accepts integer halalah >= 100 (1 SAR)', () => {
      expect(() => assertMoyasarCheckoutChargeHalalah(100)).not.toThrow()
      expect(() => assertMoyasarCheckoutChargeHalalah(1500)).not.toThrow()
    })

    it('rejects amounts below 1 SAR (99 halalah)', () => {
      expect(() => assertMoyasarCheckoutChargeHalalah(99)).toThrow(/at least 100 halalah/)
      expect(() => assertMoyasarCheckoutChargeHalalah(50)).toThrow(/at least 100 halalah/)
    })
  })
})
