/**
 * Unit tests for automation-rule.validator
 */

import {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
} from '../automation-rule.validator'

describe('automation-rule.validator', () => {
  describe('createAutomationRuleSchema', () => {
    it('accepts valid input', () => {
      const result = createAutomationRuleSchema.safeParse({
        name: 'Welcome Email',
        trigger: 'BOOKING_CREATED',
        channels: ['EMAIL'],
      })
      expect(result.success).toBe(true)
    })
    it('accepts full input', () => {
      const result = createAutomationRuleSchema.safeParse({
        name: 'Rule',
        description: 'Desc',
        trigger: 'BOOKING_CREATED',
        channels: ['EMAIL', 'SMS'],
        recipientType: 'CUSTOMER',
        timezone: 'Asia/Riyadh',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when name empty', () => {
      const result = createAutomationRuleSchema.safeParse({
        name: '',
        trigger: 'X',
        channels: ['EMAIL'],
      })
      expect(result.success).toBe(false)
    })
    it('rejects when channels empty', () => {
      const result = createAutomationRuleSchema.safeParse({
        name: 'Rule',
        trigger: 'X',
        channels: [],
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid channel', () => {
      const result = createAutomationRuleSchema.safeParse({
        name: 'Rule',
        trigger: 'X',
        channels: ['INVALID'],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateAutomationRuleSchema', () => {
    it('accepts partial update', () => {
      const result = updateAutomationRuleSchema.safeParse({
        name: 'Updated',
      })
      expect(result.success).toBe(true)
    })
  })
})
