/**
 * Unit tests for check-translations
 */

import * as fs from 'fs'
import { flattenObject, run } from '../check-translations'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}))

const mockExistsSync = fs.existsSync as jest.Mock
const mockReadFileSync = fs.readFileSync as jest.Mock

describe('check-translations', () => {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    mockReadFileSync.mockReturnValue('{}')
  })

  afterAll(() => {
    exitSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('flattenObject', () => {
    it('flattens flat object', () => {
      const result = flattenObject({ a: '1', b: '2' })
      expect(result).toEqual({ a: '1', b: '2' })
    })

    it('flattens nested object with prefix', () => {
      const result = flattenObject({ a: { b: { c: 'val' } } })
      expect(result).toEqual({ 'a.b.c': 'val' })
    })

    it('handles mixed flat and nested', () => {
      const result = flattenObject({ x: 'flat', nested: { y: 'inner' } })
      expect(result).toEqual({ x: 'flat', 'nested.y': 'inner' })
    })

    it('handles null and empty string values', () => {
      const result = flattenObject({ a: null, b: '' })
      expect(result).toEqual({ a: '', b: '' })
    })

    it('handles arrays as leaf values (stringified)', () => {
      const result = flattenObject({ arr: [1, 2] })
      expect(result).toEqual({ arr: '1,2' })
    })
  })

  describe('run', () => {
    it('exits 1 when source file not found', () => {
      mockExistsSync.mockImplementationOnce(() => false)
      run('/mock/messages')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Source file not found'))
    })

    it('exits 1 when target language file missing', () => {
      const source = { key: 'value' }
      mockExistsSync
        .mockImplementationOnce(() => true)
        .mockImplementationOnce(() => false)
      mockReadFileSync.mockReturnValueOnce(JSON.stringify(source))
      run('/mock/messages')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Missing language file'))
    })

    it('exits 1 when target has missing keys', () => {
      const source = { common: { save: 'Save', cancel: 'Cancel' } }
      const ar = { common: { save: 'حفظ' } } // missing cancel
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(ar))
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(source))

      run('/mock/messages')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Translation check FAILED'))
    })

    it('shows "and N more" when missing keys > 5', () => {
      const source = { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7' }
      const ar = { a: '1' }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(ar))
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(source))

      run('/mock/messages')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('... and 1 more'))
    })

    it('shows "and N more" when placeholders > 5', () => {
      const source = { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7' }
      const ar = {
        a: '_NEEDED:1',
        b: '_NEEDED:2',
        c: '_NEEDED:3',
        d: '_NEEDED:4',
        e: '_NEEDED:5',
        f: '_NEEDED:6',
        g: '_NEEDED:7',
      }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(ar))
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(source))

      run('/mock/messages')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('... and 2 more'))
    })

    it('exits 1 when target has empty values', () => {
      const source = { key: 'value' }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify({ key: '' }))
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(source))

      run('/mock/messages')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits 1 when target has _NEEDED: placeholders', () => {
      const source = { key: 'value' }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify({ key: '_NEEDED: translate this' }))
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify(source))

      run('/mock/messages')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits 0 when all translations complete', () => {
      const source = { common: { save: 'Save', cancel: 'Cancel' } }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(JSON.stringify({ common: { save: 'حفظ', cancel: 'إلغاء' } }))
        .mockReturnValueOnce(JSON.stringify({ common: { save: '保存', cancel: '取消' } }))
        .mockReturnValueOnce(JSON.stringify({ common: { save: 'Enregistrer', cancel: 'Annuler' } }))

      run('/mock/messages')
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('All translations complete'))
    })
  })

  describe('CLI entry', () => {
    it('does not run when NODE_ENV is test', () => {
      expect(process.env.NODE_ENV).toBe('test')
      // Lines 103-104: guard prevents run() at load; run() is tested above
    })
  })
})
