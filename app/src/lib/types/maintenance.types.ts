/**
 * @file maintenance.types.ts
 * @description TypeScript types for maintenance management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

import type { EquipmentCondition } from '@prisma/client'

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection' | 'repair' | 'calibration'
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Maintenance {
  id: string
  maintenanceNumber: string
  equipmentId: string
  type: MaintenanceType
  status: MaintenanceStatus
  priority: MaintenancePriority
  scheduledDate: Date
  completedDate?: Date | null
  technicianId?: string | null
  description: string
  notes?: string | null
  cost?: number | null
  partsUsed?: Array<{
    partName: string
    quantity: number
    cost: number
  }>
  equipmentConditionBefore?: EquipmentCondition | null
  equipmentConditionAfter?: EquipmentCondition | null
  equipment?: {
    id: string
    sku: string
    model: string | null
  }
  technician?: {
    id: string
    name: string | null
    email: string
  } | null
  createdAt: Date
  updatedAt: Date
}

export interface MaintenanceCreateInput {
  equipmentId: string
  type: MaintenanceType
  priority: MaintenancePriority
  scheduledDate: Date
  technicianId?: string
  description: string
  notes?: string
}

export interface MaintenanceUpdateInput {
  type?: MaintenanceType
  priority?: MaintenancePriority
  scheduledDate?: Date
  technicianId?: string
  description?: string
  notes?: string
  status?: MaintenanceStatus
}

export interface MaintenanceCompleteInput {
  completedDate?: Date
  notes?: string
  cost?: number
  partsUsed?: Array<{
    partName: string
    quantity: number
    cost: number
  }>
  equipmentConditionAfter?: EquipmentCondition
}
