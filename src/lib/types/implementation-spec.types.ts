/**
 * @file implementation-spec.types.ts
 * @description Data model types from Implementation Spec (§3). Use for mock data and API alignment.
 * @module lib/types
 * @see docs/IMPLEMENTATION_SPEC.md
 */

// --- User (Spec §3) ---

export type ImplementationSpecUserRole =
  | 'super_admin'
  | 'admin_ops'
  | 'admin_finance'
  | 'tech_staff'
  | 'customer'

export type ImplementationSpecUserStatus = 'approved' | 'pending' | 'suspended'

export type DocumentStatus = 'missing' | 'submitted' | 'verified'

export interface ImplementationSpecUserCompany {
  name: string
  vatNumber?: string
  address?: string
}

export interface ImplementationSpecUserDocuments {
  idFront?: string
  idBack?: string
  crDoc?: string
  status: DocumentStatus
}

export interface ImplementationSpecUser {
  id: string
  name: string
  email: string
  phone: string
  role: ImplementationSpecUserRole
  status: ImplementationSpecUserStatus
  company: ImplementationSpecUserCompany
  documents: ImplementationSpecUserDocuments
}

// --- Equipment (Spec §3) ---

export type EquipmentInventoryMode = 'quantity' | 'serialized'

export type EquipmentStatusSpec = 'active' | 'maintenance' | 'damaged' | 'retired'

export interface EquipmentCompatibility {
  mounts?: string[]
  systems?: string[]
  voltage?: string[]
}

export interface ImplementationSpecEquipment {
  id: string
  slug: string
  name: string
  brand: string
  category: string
  tags: string[]
  pricePerDay: number
  specs: Record<string, unknown>
  compatibility: EquipmentCompatibility
  availability: boolean // computed from date range
  status: EquipmentStatusSpec
  inventoryMode: EquipmentInventoryMode
  quantityAvailable?: number
  serials?: string[]
}

// --- Cart (Spec §3) ---

export interface CartItemSpec {
  equipmentId: string
  qty: number
  startAt: string // ISO date
  endAt: string
}

export type FulfillmentType = 'pickup' | 'delivery'

export interface ImplementationSpecCart {
  items: CartItemSpec[]
  fulfillment: FulfillmentType
  branchId: string
  deliveryZoneId?: string
}

// --- Booking (Spec §3) ---

export type BookingStatusSpec =
  | 'draft'
  | 'pending_profile'
  | 'pending_approval'
  | 'hold'
  | 'pending_payment'
  | 'confirmed'
  | 'picked_up'
  | 'active'
  | 'return_pending_check'
  | 'closed'
  | 'cancelled'

export interface BookingAddOns {
  insurancePlan?: string
  technician?: boolean
  deliveryFee?: number
  extras?: string[]
}

export interface PricingBreakdown {
  subtotal: number
  discount?: number
  addOns?: number
  tax?: number
  deposit?: number
  total: number
}

export interface ImplementationSpecBooking {
  id: string
  customerId: string
  items: Array<{ equipmentId: string; qty: number; name?: string; pricePerDay?: number }>
  startAt: string
  endAt: string
  fulfillment: FulfillmentType
  branchId: string
  deliveryZoneId?: string
  addOns: BookingAddOns
  pricing: PricingBreakdown
  status: BookingStatusSpec
}

// --- PricingRule (Spec §3) ---

export type PricingRuleTypeSpec =
  | 'weekend'
  | 'long_term'
  | 'client_tier'
  | 'manual_override'

export interface ImplementationSpecPricingRule {
  id: string
  type: PricingRuleTypeSpec
  condition: Record<string, unknown>
  effect: Record<string, unknown>
}
