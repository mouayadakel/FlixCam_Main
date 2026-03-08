/**
 * Unit tests for letter-template.utils
 */

import { replacePlaceholders } from '../letter-template.utils'

describe('letter-template.utils', () => {
  describe('replacePlaceholders', () => {
    it('replaces all placeholders with data', () => {
      const template = 'Dear {{client_name}}, Order {{order_number}} for {{equipment_name}}.'
      const data = {
        client_name: 'Ahmed',
        client_id: 'c_1',
        date: '2026-03-01',
        order_number: 'ORD-123',
        equipment_name: 'Sony FX3',
      }
      expect(replacePlaceholders(template, data)).toBe(
        'Dear Ahmed, Order ORD-123 for Sony FX3.'
      )
    })

    it('replaces multiple occurrences of same placeholder', () => {
      const template = '{{client_name}} - {{client_name}}'
      const data = {
        client_name: 'Ali',
        client_id: '',
        date: '',
        order_number: '',
        equipment_name: '',
      }
      expect(replacePlaceholders(template, data)).toBe('Ali - Ali')
    })

    it('uses empty string for missing data', () => {
      const template = '{{client_name}}{{order_number}}'
      const data = {
        client_name: '',
        client_id: '',
        date: '',
        order_number: '',
        equipment_name: '',
      }
      expect(replacePlaceholders(template, data)).toBe('')
    })

    it('leaves unknown placeholders unchanged', () => {
      const template = 'Hello {{client_name}} and {{unknown_key}}'
      const data = {
        client_name: 'Test',
        client_id: '',
        date: '',
        order_number: '',
        equipment_name: '',
      }
      expect(replacePlaceholders(template, data)).toBe('Hello Test and {{unknown_key}}')
    })

    it('uses empty string when data key is undefined (partial data)', () => {
      const template = '{{client_name}} {{order_number}}'
      const data = {
        client_name: 'Ali',
        client_id: 'c1',
        date: '2026-01-01',
        order_number: undefined as unknown as string,
        equipment_name: '',
      }
      expect(replacePlaceholders(template, data)).toBe('Ali ')
    })
  })
})
