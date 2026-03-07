/**
 * Unit tests for excel-parser
 */

import ExcelJS from 'exceljs'
import {
  parseCsvBuffer,
  parseExcelBuffer,
  parseSpreadsheetBuffer,
} from '../excel-parser'

describe('excel-parser', () => {
  describe('parseCsvBuffer', () => {
    it('parses CSV with headers', () => {
      const csv = 'name,price,sku\nCamera A,100,CAM-001\nLens B,50,LNS-001'
      const result = parseCsvBuffer(Buffer.from(csv))
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'Camera A', price: '100', sku: 'CAM-001' })
      expect(result[1]).toEqual({ name: 'Lens B', price: '50', sku: 'LNS-001' })
    })
    it('parses TSV with tab delimiter', () => {
      const tsv = 'name\tprice\nItem\t99'
      const result = parseCsvBuffer(Buffer.from(tsv), '\t')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ name: 'Item', price: '99' })
    })
    it('returns empty array for empty input', () => {
      const result = parseCsvBuffer(Buffer.from(''))
      expect(result).toEqual([])
    })
    it('parses CSV with quoted values containing delimiter', () => {
      const csv = 'name,price\n"Camera, Pro",100\n"Lens, Wide",50'
      const result = parseCsvBuffer(Buffer.from(csv))
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'Camera, Pro', price: '100' })
      expect(result[1]).toEqual({ name: 'Lens, Wide', price: '50' })
    })
    it('accepts Uint8Array input', () => {
      const csv = 'a,b\n1,2'
      const result = parseCsvBuffer(new Uint8Array(Buffer.from(csv)))
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ a: '1', b: '2' })
    })
  })

  describe('parseExcelBuffer', () => {
    it('parses xlsx buffer', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Sheet1')
      ws.addRow(['name', 'price', 'sku'])
      ws.addRow(['Camera A', 100, 'CAM-001'])
      ws.addRow(['Lens B', 50, 'LNS-001'])
      const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer
      const result = await parseExcelBuffer(buf)
      expect(result.sheetNames).toEqual(['Sheet1'])
      expect(result.getSheetData('Sheet1')).toHaveLength(2)
      expect(result.sheets.Sheet1[0]).toEqual({ name: 'Camera A', price: 100, sku: 'CAM-001' })
      expect(result.sheets.Sheet1[1]).toEqual({ name: 'Lens B', price: 50, sku: 'LNS-001' })
    })
    it('returns empty array for getSheetData of unknown sheet', async () => {
      const wb = new ExcelJS.Workbook()
      wb.addWorksheet('Sheet1')
      const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer
      const result = await parseExcelBuffer(buf)
      expect(result.getSheetData('Unknown')).toEqual([])
    })
    it('deduplicates duplicate column headers with suffix', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Dupes')
      ws.addRow(['name', 'name', 'name', 'price'])
      ws.addRow(['Camera', 'Lens', 'Light', 100])
      const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer
      const result = await parseExcelBuffer(buf)
      const rows = result.sheets.Dupes
      expect(rows).toHaveLength(1)
      expect(Object.keys(rows[0])).toEqual(['name', 'name_1', 'name_2', 'price'])
      expect(rows[0]).toEqual({ name: 'Camera', name_1: 'Lens', name_2: 'Light', price: 100 })
    })
    it('accepts Uint8Array input', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Data')
      ws.addRow(['x'])
      ws.addRow([1])
      const buf = await wb.xlsx.writeBuffer()
      const result = await parseExcelBuffer(new Uint8Array(buf as ArrayBuffer))
      expect(result.sheets.Data).toHaveLength(1)
      expect(result.sheets.Data[0]).toEqual({ x: 1 })
    })
  })

  describe('parseSpreadsheetBuffer', () => {
    it('parses .csv file', async () => {
      const csv = 'a,b\n1,2'
      const result = await parseSpreadsheetBuffer(Buffer.from(csv), 'data.csv')
      expect(result.sheetNames).toEqual(['Sheet1'])
      expect(result.getSheetData('Sheet1')).toHaveLength(1)
      expect(result.sheets.Sheet1[0]).toEqual({ a: '1', b: '2' })
    })
    it('parses .tsv file', async () => {
      const tsv = 'x\ty\n1\t2'
      const result = await parseSpreadsheetBuffer(Buffer.from(tsv), 'data.tsv')
      expect(result.sheetNames).toEqual(['Sheet1'])
      expect(result.sheets.Sheet1[0]).toEqual({ x: '1', y: '2' })
    })
    it('parses .xlsx file', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('MySheet')
      ws.addRow(['col'])
      ws.addRow([1])
      const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer
      const result = await parseSpreadsheetBuffer(buf, 'file.xlsx')
      expect(result.sheetNames).toContain('MySheet')
      expect(result.sheets.MySheet[0]).toEqual({ col: 1 })
    })
    it('throws for .xls file', async () => {
      await expect(
        parseSpreadsheetBuffer(Buffer.from(''), 'legacy.xls')
      ).rejects.toThrow('Legacy .xls format not supported')
    })
    it('throws for unsupported extension', async () => {
      await expect(
        parseSpreadsheetBuffer(Buffer.from(''), 'file.pdf')
      ).rejects.toThrow('Unsupported file type')
    })
    it('throws for empty extension', async () => {
      await expect(
        parseSpreadsheetBuffer(Buffer.from(''), 'noext')
      ).rejects.toThrow('Unsupported file type')
    })
  })
})
