/**
 * Letter template placeholder replacement for promissory notes
 */

export interface LetterTemplateData {
  client_name: string
  client_id: string
  date: string
  order_number: string
  equipment_name: string
}

const PLACEHOLDERS: (keyof LetterTemplateData)[] = [
  'client_name',
  'client_id',
  'date',
  'order_number',
  'equipment_name',
]

export function replacePlaceholders(
  template: string,
  data: LetterTemplateData
): string {
  let result = template
  for (const key of PLACEHOLDERS) {
    const value = data[key] ?? ''
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}
