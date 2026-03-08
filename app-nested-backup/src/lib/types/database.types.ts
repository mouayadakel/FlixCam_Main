/**
 * @file database.types.ts
 * @description Base TypeScript types for database entities
 * @module lib/types
 * @see /docs/DATABASE_SCHEMA.md for database schema documentation
 */

// Enums
export type EquipmentCondition = 'new' | 'excellent' | 'good' | 'fair' | 'damaged' | 'retired'
export type EquipmentStatus =
  | 'available'
  | 'booked'
  | 'checked_out'
  | 'maintenance'
  | 'lost'
  | 'sold'
export type BookingState =
  | 'draft'
  | 'risk_check'
  | 'payment_pending'
  | 'confirmed'
  | 'active'
  | 'returned'
  | 'closed'
  | 'cancelled'
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'staff'
  | 'warehouse'
  | 'driver'
  | 'technician'
  | 'client'

// Multi-language text type
export interface MultiLangText {
  ar: string
  en: string
}

// Equipment Types
export interface Equipment {
  id: string
  category_id: number
  brand_id: number
  name: MultiLangText
  model: string
  serial_number: string
  sku: string
  description: MultiLangText
  specifications: Record<string, any>
  condition: EquipmentCondition
  status: EquipmentStatus
  purchase_date: Date | string
  purchase_price: number
  current_value: number
  qr_code: string
  barcode: string
  location: string
  is_sub_rented: boolean
  supplier_id?: number | null
  created_at: Date | string
  updated_at: Date | string
}

// Booking Types
export interface Booking {
  id: string
  booking_number: string
  client_id: string
  state: BookingState
  start_date: Date | string
  end_date: Date | string
  subtotal: number
  tax: number
  total: number
  deposit_amount: number
  deposit_paid: boolean
  payment_method?: string | null
  delivery_required: boolean
  delivery_address?: string | null
  delivery_fee?: number | null
  notes?: string | null
  created_by: string
  created_at: Date | string
  updated_at: Date | string
}

// Client Types
export interface Client {
  id: string
  user_id?: string | null
  full_name: string
  email: string
  phone: string
  company_name?: string | null
  tax_id?: string | null
  commercial_registration?: string | null
  address?: string | null
  city?: string | null
  country: string
  risk_score: number
  is_blacklisted: boolean
  blacklist_reason?: string | null
  created_at: Date | string
  updated_at: Date | string
}

// Database type for Supabase
export interface Database {
  public: {
    Tables: {
      equipment_items: {
        Row: Equipment
        Insert: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Equipment, 'id' | 'created_at' | 'updated_at'>>
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'booking_number' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Booking, 'id' | 'booking_number' | 'created_at' | 'updated_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
      }
      // Add more tables as needed from DATABASE_SCHEMA.sql
    }
  }
}
