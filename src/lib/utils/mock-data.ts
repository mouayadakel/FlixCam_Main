/**
 * @file mock-data.ts
 * @description Mock data for admin panel UI
 * @module lib/utils
 */

export interface MockEquipment {
  id: string
  name: string
  sku: string
  category: string
  brand: string
  status: string
  stock: number
  updatedAt: string
  boxMissing?: boolean
}

export interface MockBooking {
  id: string
  bookingNumber: string
  customer: string
  status: string
  totalAmount: number
  startDate: string
  endDate: string
  createdAt: string
}

export interface MockCategory {
  id: string
  name: string
  slug: string
  equipmentCount: number
  parentId?: string
}

export interface MockUser {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export interface MockOrder {
  id: string
  orderNumber: string
  customer: string
  status: string
  totalAmount: number
  createdAt: string
}

export interface MockInvoice {
  id: string
  invoiceNumber: string
  orderNumber: string
  amount: number
  status: string
  dueDate: string
  createdAt: string
}

export interface MockWalletTx {
  id: string
  user: string
  type: 'credit' | 'debit'
  amount: number
  balance: number
  note?: string
  createdAt: string
}

export interface MockStudio {
  id: string
  name: string
  location: string
  status: string
  rate: number
  capacity: number
}

export interface MockTechnician {
  id: string
  name: string
  phone: string
  specialty: string
  status: string
  jobs: number
}

export interface MockCoupon {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  usage: string
  status: string
  expiresAt: string
}

export interface MockStat {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface MockActivity {
  id: string
  action: string
  user: string
  resource: string
  timestamp: string
}

export const mockEquipment: MockEquipment[] = [
  {
    id: '1',
    name: 'Sony FX6 Cinema Camera',
    sku: 'CAM-001',
    category: 'Cameras',
    brand: 'Sony',
    status: 'active',
    stock: 3,
    updatedAt: '2026-01-25',
    boxMissing: false,
  },
  {
    id: '2',
    name: 'Canon C300 Mark III',
    sku: 'CAM-002',
    category: 'Cameras',
    brand: 'Canon',
    status: 'active',
    stock: 2,
    updatedAt: '2026-01-24',
    boxMissing: true,
  },
  {
    id: '3',
    name: 'Sony 24-70mm f/2.8 Lens',
    sku: 'LENS-001',
    category: 'Lenses',
    brand: 'Sony',
    status: 'active',
    stock: 5,
    updatedAt: '2026-01-23',
    boxMissing: false,
  },
  {
    id: '4',
    name: 'ARRI Alexa Mini LF',
    sku: 'CAM-003',
    category: 'Cameras',
    brand: 'ARRI',
    status: 'maintenance',
    stock: 1,
    updatedAt: '2026-01-22',
    boxMissing: true,
  },
  {
    id: '5',
    name: 'RED Komodo 6K',
    sku: 'CAM-004',
    category: 'Cameras',
    brand: 'RED',
    status: 'active',
    stock: 2,
    updatedAt: '2026-01-21',
    boxMissing: false,
  },
  {
    id: '6',
    name: 'Canon 70-200mm f/2.8 Lens',
    sku: 'LENS-002',
    category: 'Lenses',
    brand: 'Canon',
    status: 'active',
    stock: 4,
    updatedAt: '2026-01-20',
    boxMissing: false,
  },
  {
    id: '7',
    name: 'Aputure 300D II Light',
    sku: 'LIGHT-001',
    category: 'Lighting',
    brand: 'Aputure',
    status: 'active',
    stock: 6,
    updatedAt: '2026-01-19',
    boxMissing: true,
  },
  {
    id: '8',
    name: 'Rode VideoMic Pro+',
    sku: 'AUDIO-001',
    category: 'Audio',
    brand: 'Rode',
    status: 'active',
    stock: 8,
    updatedAt: '2026-01-18',
    boxMissing: false,
  },
  {
    id: '9',
    name: 'Manfrotto 055 Tripod',
    sku: 'GRIP-001',
    category: 'Grip',
    brand: 'Manfrotto',
    status: 'active',
    stock: 10,
    updatedAt: '2026-01-17',
  },
  {
    id: '10',
    name: 'Blackmagic Pocket Cinema 6K',
    sku: 'CAM-005',
    category: 'Cameras',
    brand: 'Blackmagic',
    status: 'active',
    stock: 3,
    updatedAt: '2026-01-16',
  },
  // Add more items to reach 20+
  ...Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 11),
    name: `Equipment Item ${i + 11}`,
    sku: `EQ-${String(i + 11).padStart(3, '0')}`,
    category: ['Cameras', 'Lenses', 'Lighting', 'Audio', 'Grip'][i % 5],
    brand: ['Sony', 'Canon', 'ARRI', 'RED', 'Blackmagic'][i % 5],
    status: i % 3 === 0 ? 'active' : 'active',
    stock: ((i % 10) + 1), // Deterministic stock value based on index
    updatedAt: `2026-01-${String(15 - i).padStart(2, '0')}`,
  })),
]

export const mockBookings: MockBooking[] = [
  {
    id: '1',
    bookingNumber: 'BK-2026-001',
    customer: 'John Doe',
    status: 'confirmed',
    totalAmount: 5000,
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    createdAt: '2026-01-20',
  },
  {
    id: '2',
    bookingNumber: 'BK-2026-002',
    customer: 'Jane Smith',
    status: 'payment_pending',
    totalAmount: 3500,
    startDate: '2026-02-10',
    endDate: '2026-02-12',
    createdAt: '2026-01-21',
  },
  {
    id: '3',
    bookingNumber: 'BK-2026-003',
    customer: 'Mike Johnson',
    status: 'active',
    totalAmount: 7500,
    startDate: '2026-01-15',
    endDate: '2026-01-20',
    createdAt: '2026-01-10',
  },
  {
    id: '4',
    bookingNumber: 'BK-2026-004',
    customer: 'Sarah Williams',
    status: 'draft',
    totalAmount: 2000,
    startDate: '2026-02-15',
    endDate: '2026-02-17',
    createdAt: '2026-01-22',
  },
  {
    id: '5',
    bookingNumber: 'BK-2026-005',
    customer: 'David Brown',
    status: 'returned',
    totalAmount: 4500,
    startDate: '2026-01-05',
    endDate: '2026-01-10',
    createdAt: '2025-12-28',
  },
  {
    id: '6',
    bookingNumber: 'BK-2026-006',
    customer: 'Emily Davis',
    status: 'risk_check',
    totalAmount: 12000,
    startDate: '2026-02-20',
    endDate: '2026-02-25',
    createdAt: '2026-01-23',
  },
  {
    id: '7',
    bookingNumber: 'BK-2026-007',
    customer: 'Robert Miller',
    status: 'closed',
    totalAmount: 3000,
    startDate: '2025-12-20',
    endDate: '2025-12-22',
    createdAt: '2025-12-15',
  },
  {
    id: '8',
    bookingNumber: 'BK-2026-008',
    customer: 'Lisa Wilson',
    status: 'cancelled',
    totalAmount: 1800,
    startDate: '2026-02-08',
    endDate: '2026-02-09',
    createdAt: '2026-01-18',
  },
  {
    id: '9',
    bookingNumber: 'BK-2026-009',
    customer: 'James Taylor',
    status: 'confirmed',
    totalAmount: 6000,
    startDate: '2026-02-28',
    endDate: '2026-03-05',
    createdAt: '2026-01-24',
  },
  {
    id: '10',
    bookingNumber: 'BK-2026-010',
    customer: 'Amanda Anderson',
    status: 'payment_pending',
    totalAmount: 2800,
    startDate: '2026-02-12',
    endDate: '2026-02-14',
    createdAt: '2026-01-25',
  },
]

export const mockCategories: MockCategory[] = [
  { id: '1', name: 'Cameras', slug: 'cameras', equipmentCount: 45 },
  { id: '2', name: 'Lenses', slug: 'lenses', equipmentCount: 32 },
  { id: '3', name: 'Lighting', slug: 'lighting', equipmentCount: 28 },
  { id: '4', name: 'Audio', slug: 'audio', equipmentCount: 18 },
  { id: '5', name: 'Grip', slug: 'grip', equipmentCount: 25 },
]

export const mockStats: MockStat[] = [
  { label: 'Total Bookings', value: 156, change: '+12%', trend: 'up' },
  { label: 'Active Rentals', value: 23, change: '+5%', trend: 'up' },
  { label: 'Revenue (SAR)', value: '245,000', change: '+18%', trend: 'up' },
  { label: 'Equipment Items', value: 148, change: '+3', trend: 'neutral' },
  { label: 'Pending Payments', value: 8, change: '-2', trend: 'down' },
  { label: 'Returned Items', value: 12, change: '+4', trend: 'up' },
]

export const mockActivities: MockActivity[] = [
  {
    id: '1',
    action: 'Booking created',
    user: 'John Doe',
    resource: 'BK-2026-001',
    timestamp: '2026-01-26 10:30',
  },
  {
    id: '2',
    action: 'Equipment updated',
    user: 'Admin',
    resource: 'CAM-001',
    timestamp: '2026-01-26 09:15',
  },
  {
    id: '3',
    action: 'Payment processed',
    user: 'System',
    resource: 'BK-2026-002',
    timestamp: '2026-01-26 08:45',
  },
  {
    id: '4',
    action: 'Booking confirmed',
    user: 'Admin',
    resource: 'BK-2026-003',
    timestamp: '2026-01-25 16:20',
  },
  {
    id: '5',
    action: 'Equipment added',
    user: 'Admin',
    resource: 'EQ-023',
    timestamp: '2026-01-25 14:10',
  },
]

export const mockUsers: MockUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', status: 'active' },
  { id: '3', name: 'Ali Ahmed', email: 'ali@example.com', role: 'Viewer', status: 'inactive' },
  { id: '4', name: 'Sara Alqahtani', email: 'sara@example.com', role: 'Support', status: 'active' },
  { id: '5', name: 'Mohammed Al Anzi', email: 'mohammed@example.com', role: 'Customer Service', status: 'active' },
  { id: '6', name: 'Noura Al Saud', email: 'noura@example.com', role: 'Marketing', status: 'active' },
]

export const mockOrders: MockOrder[] = mockBookings.map((b, idx) => ({
  id: b.id,
  orderNumber: `ORD-${b.bookingNumber.split('-').slice(-1)[0]}`,
  customer: b.customer,
  status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'][idx % 5],
  totalAmount: b.totalAmount,
  createdAt: b.createdAt,
}))

export const mockInvoices: MockInvoice[] = mockBookings.slice(0, 10).map((b, idx) => ({
  id: b.id,
  invoiceNumber: `INV-2026-${String(idx + 1).padStart(3, '0')}`,
  orderNumber: `ORD-2026-${String(idx + 1).padStart(3, '0')}`,
  amount: b.totalAmount,
  status: idx % 3 === 0 ? 'paid' : idx % 3 === 1 ? 'pending' : 'overdue',
  dueDate: b.endDate,
  createdAt: b.createdAt,
}))

export const mockWalletTransactions: MockWalletTx[] = [
  { id: '1', user: 'John Doe', type: 'credit', amount: 500, balance: 1200, note: 'Top-up', createdAt: '2026-01-25' },
  { id: '2', user: 'Jane Smith', type: 'debit', amount: 250, balance: 450, note: 'Order payment', createdAt: '2026-01-24' },
  { id: '3', user: 'Ali Ahmed', type: 'credit', amount: 800, balance: 1300, note: 'Refund', createdAt: '2026-01-23' },
]

export const mockStudios: MockStudio[] = [
  { id: '1', name: 'Studio A', location: 'Riyadh', status: 'active', rate: 1500, capacity: 12 },
  { id: '2', name: 'Studio B', location: 'Jeddah', status: 'maintenance', rate: 1200, capacity: 10 },
  { id: '3', name: 'Studio C', location: 'Dammam', status: 'active', rate: 900, capacity: 8 },
]

export const mockTechnicians: MockTechnician[] = [
  { id: '1', name: 'Omar Khalid', phone: '+96650000001', specialty: 'Lighting', status: 'active', jobs: 34 },
  { id: '2', name: 'Maha Ali', phone: '+96650000002', specialty: 'Camera', status: 'on-leave', jobs: 18 },
  { id: '3', name: 'Abdulaziz Fahad', phone: '+96650000003', specialty: 'Audio', status: 'active', jobs: 25 },
]

export const mockCoupons: MockCoupon[] = [
  { id: '1', code: 'WELCOME15', type: 'percent', value: 15, usage: '3 / 100', status: 'active', expiresAt: '2026-03-01' },
  { id: '2', code: 'WINTER200', type: 'fixed', value: 200, usage: '20 / 50', status: 'expired', expiresAt: '2026-01-15' },
  { id: '3', code: 'SPRING10', type: 'percent', value: 10, usage: '0 / 200', status: 'scheduled', expiresAt: '2026-04-15' },
]
