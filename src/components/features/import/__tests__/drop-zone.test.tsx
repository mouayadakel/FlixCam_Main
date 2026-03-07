/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from '../drop-zone'

describe('DropZone', () => {
  const onFileSelect = jest.fn()
  const onClear = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders upload prompt when no file selected', () => {
    render(
      <DropZone file={null} onFileSelect={onFileSelect} onClear={onClear} />
    )
    expect(screen.getByText(/اسحب ملف Excel أو CSV هنا/)).toBeTruthy()
    expect(screen.getByText(/أو اضغط للاختيار/)).toBeTruthy()
    expect(screen.getByTitle('اختر ملف Excel أو CSV')).toBeTruthy()
  })

  it('shows accepted extensions and max size', () => {
    render(
      <DropZone file={null} onFileSelect={onFileSelect} onClear={onClear} maxSizeMB={50} />
    )
    expect(screen.getByText(/.xlsx, .xls, .csv, .tsv — حد أقصى 50MB/)).toBeTruthy()
  })

  it('shows file name and clear button when file is set', () => {
    const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    render(
      <DropZone file={file} onFileSelect={onFileSelect} onClear={onClear} />
    )
    expect(screen.getByText('test.xlsx')).toBeTruthy()
    const clearBtn = screen.getByRole('button')
    expect(clearBtn).toBeTruthy()
    fireEvent.click(clearBtn)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('calls onFileSelect when valid file is selected via input', () => {
    const file = new File(['x'], 'sheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    render(
      <DropZone file={null} onFileSelect={onFileSelect} onClear={onClear} />
    )
    const input = screen.getByTitle('اختر ملف Excel أو CSV')
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFileSelect).toHaveBeenCalledWith(file)
  })

  it('shows error for unsupported file type', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    render(
      <DropZone file={null} onFileSelect={onFileSelect} onClear={onClear} />
    )
    const input = screen.getByTitle('اختر ملف Excel أو CSV')
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFileSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/نوع الملف غير مدعوم/)).toBeTruthy()
  })

  it('disables input when disabled prop is true', () => {
    render(
      <DropZone file={null} onFileSelect={onFileSelect} onClear={onClear} disabled />
    )
    const input = screen.getByTitle('اختر ملف Excel أو CSV')
    expect(input.disabled).toBe(true)
  })
})
