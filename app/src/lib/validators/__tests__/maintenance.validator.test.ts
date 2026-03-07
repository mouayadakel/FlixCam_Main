/**
 * Unit tests for maintenance.validator
 */

import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  completeMaintenanceSchema,
  maintenanceFilterSchema,
  maintenanceStatusSchema,
  maintenanceTypeSchema,
  maintenancePrioritySchema,
} from '../maintenance.validator'

describe('maintenance.validator', () => {
  describe('maintenanceStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(maintenanceStatusSchema.safeParse('scheduled').success).toBe(true)
      expect(maintenanceStatusSchema.safeParse('completed').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(maintenanceStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('maintenanceTypeSchema', () => {
    it('accepts valid types', () => {
      expect(maintenanceTypeSchema.safeParse('preventive').success).toBe(true)
      expect(maintenanceTypeSchema.safeParse('repair').success).toBe(true)
    })
  })

  describe('maintenancePrioritySchema', () => {
    it('accepts valid priorities', () => {
      expect(maintenancePrioritySchema.safeParse('high').success).toBe(true)
      expect(maintenancePrioritySchema.safeParse('urgent').success).toBe(true)
    })
  })

  describe('createMaintenanceSchema', () => {
    it('accepts valid input', () => {
      const result = createMaintenanceSchema.safeParse({
        equipmentId: 'eq_123',
        type: 'preventive',
        priority: 'medium',
        scheduledDate: '2026-03-15',
        description: 'Routine inspection',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with technicianId and notes', () => {
      const result = createMaintenanceSchema.safeParse({
        equipmentId: 'eq_123',
        type: 'repair',
        priority: 'high',
        scheduledDate: '2026-03-15',
        technicianId: 'tech_1',
        description: 'Camera repair',
        notes: 'Lens replacement',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when equipmentId empty', () => {
      const result = createMaintenanceSchema.safeParse({
        equipmentId: '',
        type: 'preventive',
        priority: 'medium',
        scheduledDate: '2026-03-15',
        description: 'Inspection',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when description empty', () => {
      const result = createMaintenanceSchema.safeParse({
        equipmentId: 'eq_123',
        type: 'preventive',
        priority: 'medium',
        scheduledDate: '2026-03-15',
        description: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateMaintenanceSchema', () => {
    it('accepts partial update', () => {
      const result = updateMaintenanceSchema.safeParse({
        status: 'completed',
        notes: 'Done',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('completeMaintenanceSchema', () => {
    it('accepts valid completion', () => {
      const result = completeMaintenanceSchema.safeParse({
        completedDate: '2026-03-15',
        notes: 'Completed successfully',
        cost: 150,
        equipmentConditionAfter: 'EXCELLENT',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with partsUsed', () => {
      const result = completeMaintenanceSchema.safeParse({
        partsUsed: [
          { partName: 'Lens', quantity: 1, cost: 200 },
        ],
      })
      expect(result.success).toBe(true)
    })
    it('rejects negative cost in partsUsed', () => {
      const result = completeMaintenanceSchema.safeParse({
        partsUsed: [
          { partName: 'Lens', quantity: 1, cost: -1 },
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('maintenanceFilterSchema', () => {
    it('accepts valid filter', () => {
      const result = maintenanceFilterSchema.safeParse({
        status: 'scheduled',
        type: 'preventive',
        equipmentId: 'eq_123',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = maintenanceFilterSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
