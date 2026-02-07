/**
 * @file field-permission-service.ts
 * @description Field-level access control for Equipment/Product (metadata, pricing, operations)
 * @module lib/auth
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

import { hasPermission } from './permission-service'

export interface FieldPermissionConfig {
  fields: string[]
  requiredPermission: string
}

const FIELD_PERMISSIONS: Record<string, Record<string, FieldPermissionConfig>> = {
  equipment: {
    metadata: {
      fields: [
        'name',
        'description',
        'descriptionAr',
        'specifications',
        'images',
        'sku',
        'serialNumber',
      ],
      requiredPermission: 'equipment.update_metadata',
    },
    pricing: {
      fields: [
        'dailyRate',
        'weeklyRate',
        'monthlyRate',
        'replacementCost',
        'purchasePrice',
      ],
      requiredPermission: 'equipment.update_pricing',
    },
    operations: {
      fields: [
        'isAvailable',
        'currentLocation',
        'condition',
        'maintenanceStatus',
      ],
      requiredPermission: 'warehouse.manage',
    },
  },
}

export interface FilterFieldsResult {
  allowed: string[]
  denied: string[]
}

/**
 * Filter object fields based on user permissions.
 * Returns { allowed, denied } - use allowed keys when reading/updating.
 */
export async function filterFieldsForUser(
  userId: string,
  resource: string,
  data: Record<string, unknown>
): Promise<FilterFieldsResult> {
  const config = FIELD_PERMISSIONS[resource]
  if (!config) {
    return {
      allowed: Object.keys(data),
      denied: [],
    }
  }

  const allowed: string[] = []
  const denied: string[] = []

  for (const [, group] of Object.entries(config)) {
    const hasAccess = await hasPermission(userId, group.requiredPermission)
    for (const field of group.fields) {
      if (field in data) {
        if (hasAccess) {
          allowed.push(field)
        } else {
          denied.push(field)
        }
      }
    }
  }

  // Fields not in any group - allow if user has equipment.read at least
  const allGroupFields = new Set(
    Object.values(config).flatMap((c) => c.fields)
  )
  for (const key of Object.keys(data)) {
    if (!allGroupFields.has(key) && !allowed.includes(key) && !denied.includes(key)) {
      allowed.push(key)
    }
  }

  return { allowed, denied }
}

/**
 * Get allowed field names for a resource (for form field hiding)
 */
export async function getAllowedFields(
  userId: string,
  resource: string
): Promise<string[]> {
  const config = FIELD_PERMISSIONS[resource]
  if (!config) return []

  const allowed: string[] = []
  for (const [, group] of Object.entries(config)) {
    const hasAccess = await hasPermission(userId, group.requiredPermission)
    if (hasAccess) {
      allowed.push(...group.fields)
    }
  }
  return allowed
}
