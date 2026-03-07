# Admin Panel Implementation Roadmap

**Equipment & Studio Rental Platform**  
**Date**: February 3, 2026  
**Based on**: [ADMIN_CONTROL_PANEL_AUDIT_REPORT.md](../audits/ADMIN_CONTROL_PANEL_AUDIT_REPORT.md)

---

## Executive Summary

**Current State**: 8 sidebar sections, ~70 routes, ~25 LIVE, ~15 PLACEHOLDER, ~30 missing critical features.

**Goal**: Transform placeholder/missing features into production-ready functionality focused on rental business operations.

**Timeline**: 6-month roadmap (12 two-week sprints)

**Team**: Assumes 2-3 full-stack developers

**Priority Focus Areas**:

1. **Weeks 1-4**: Studios module (PLACEHOLDER → LIVE) + Calendar view
2. **Weeks 5-8**: Advanced booking features + Damage management
3. **Weeks 9-12**: Financial module completion + Pricing engine
4. **Weeks 13-16**: Customer segments + Marketing automation
5. **Weeks 17-20**: Reporting & Analytics suite
6. **Weeks 21-24**: Polish, optimization, advanced features

---

## 1. Quick Win Opportunities (Implement This Week)

### Quick Win #1: Approvals Page - Wire to API

**Route**: `/admin/approvals`  
**Current Status**: EXISTS (UI present; approve/reject not calling API)  
**Estimated Hours**: 4-6 hours

**What's Missing**:

- API endpoints for approve/reject actions
- Optimistic UI updates
- Toast notifications on success/error
- Audit log for approval decisions

**Implementation Steps**:

```typescript
// Step 1: Create API route at src/app/api/admin/approvals/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, notes } = await req.json()

  try {
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'CONFIRMED' : 'REJECTED',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        approvalNotes: notes,
      },
      include: {
        customer: true,
        items: true,
      },
    })

    // Log the approval action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `BOOKING_${action.toUpperCase()}`,
        entityType: 'BOOKING',
        entityId: params.id,
        details: { notes, previousStatus: booking.status },
      },
    })

    // Send notification to customer
    if (action === 'approve') {
      await sendEmail({
        to: booking.customer.email,
        template: 'booking-approved',
        data: booking,
      })
    }

    return NextResponse.json(booking)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
```

```typescript
// Step 2: Update approval component at src/app/admin/(routes)/approvals/page.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(null);

  const handleApproval = async (bookingId: string, action: 'approve' | 'reject') => {
    setLoading(bookingId);

    try {
      const response = await fetch(`/api/admin/approvals/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) throw new Error('Failed to process approval');

      const updated = await response.json();

      toast.success(
        action === 'approve'
          ? '✅ Booking approved successfully'
          : '❌ Booking rejected'
      );

      // Optimistically update UI
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    } catch (error) {
      toast.error('Failed to process approval');
    } finally {
      setLoading(null);
    }
  };

  return (
    // ... existing UI with updated onClick handlers
  );
}
```

**Testing Checklist**:

- [ ] Approve action updates booking status to CONFIRMED
- [ ] Reject action updates booking status to REJECTED
- [ ] Audit log entry created
- [ ] Email sent to customer
- [ ] Toast notification appears
- [ ] UI updates optimistically

---

### Quick Win #2: Brands Page - Connect to Database

**Route**: `/admin/inventory/brands`  
**Current Status**: EXISTS (page present, likely mock data)  
**Estimated Hours**: 3-4 hours

**Implementation Steps**:

```typescript
// Step 1: Create API route src/app/api/admin/brands/route.ts
export async function GET() {
  const brands = await prisma.brand.findMany({
    include: {
      _count: {
        select: { equipment: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(brands)
}

export async function POST(req: Request) {
  const { name, logo, website } = await req.json()

  const brand = await prisma.brand.create({
    data: { name, logo, website },
  })

  return NextResponse.json(brand)
}
```

```typescript
// Step 2: Update brands page to fetch real data
import { useQuery, useMutation } from '@tanstack/react-query'

export default function BrandsPage() {
  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await fetch('/api/admin/brands')
      return res.json()
    },
  })

  const createBrand = useMutation({
    mutationFn: async (data: BrandInput) => {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['brands'])
      toast.success('Brand created')
    },
  })

  // ... render brands table
}
```

---

### Quick Win #3: Calendar - Replace Mock Data

**Route**: `/admin/calendar`  
**Current Status**: PLACEHOLDER (mock data)  
**Estimated Hours**: 6-8 hours

**What's Missing**:

- Real booking data feed
- Equipment + Studio combined view
- Basic navigation (no drag-drop yet)

**Implementation Steps**:

```typescript
// Step 1: Create calendar API endpoint
// src/app/api/admin/calendar/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const start = new Date(searchParams.get('start') || '')
  const end = new Date(searchParams.get('end') || '')

  const bookings = await prisma.booking.findMany({
    where: {
      AND: [
        { startDate: { lte: end } },
        { endDate: { gte: start } },
        { status: { in: ['CONFIRMED', 'PENDING', 'ACTIVE'] } },
      ],
    },
    include: {
      customer: { select: { name: true } },
      items: {
        include: {
          equipment: { select: { name: true } },
        },
      },
      studio: { select: { name: true } },
    },
  })

  // Transform to calendar events format
  const events = bookings.flatMap((booking) => {
    const events = []

    // Add studio booking if exists
    if (booking.studio) {
      events.push({
        id: `studio-${booking.id}`,
        title: `${booking.customer.name} - ${booking.studio.name}`,
        start: booking.startDate,
        end: booking.endDate,
        resourceType: 'studio',
        resourceId: booking.studioId,
        bookingId: booking.id,
        status: booking.status,
      })
    }

    // Add equipment bookings
    booking.items.forEach((item) => {
      events.push({
        id: `equipment-${booking.id}-${item.equipmentId}`,
        title: `${booking.customer.name} - ${item.equipment.name}`,
        start: booking.startDate,
        end: booking.endDate,
        resourceType: 'equipment',
        resourceId: item.equipmentId,
        bookingId: booking.id,
        status: booking.status,
      })
    })

    return events
  })

  return NextResponse.json(events)
}
```

```typescript
// Step 2: Install and configure FullCalendar
// npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

// src/app/admin/(routes)/calendar/page.tsx
'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from '@tanstack/react-query';

export default function CalendarPage() {
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      });
      const res = await fetch(`/api/admin/calendar?${params}`);
      return res.json();
    }
  });

  return (
    <div className="p-6">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        eventClick={(info) => {
          router.push(`/admin/bookings/${info.event.extendedProps.bookingId}`);
        }}
        datesSet={(dateInfo) => {
          setDateRange({
            start: dateInfo.start,
            end: dateInfo.end
          });
        }}
        eventColor="#3b82f6"
        eventClassNames={(arg) => {
          const status = arg.event.extendedProps.status;
          return [
            status === 'CONFIRMED' ? 'bg-green-500' : '',
            status === 'PENDING' ? 'bg-yellow-500' : '',
            status === 'ACTIVE' ? 'bg-blue-500' : ''
          ];
        }}
      />
    </div>
  );
}
```

---

### Quick Win #4: Action Center - Connect Real Data

**Route**: `/admin/action-center`  
**Current Status**: EXISTS (mixed sample data)  
**Estimated Hours**: 3-4 hours

**Steps**:

1. Create `/api/admin/action-center` endpoint
2. Aggregate pending tasks (bookings needing approval, overdue returns, maintenance due)
3. Replace mock data with real queries
4. Add real-time refresh (SWR or React Query)

---

### Quick Win #5: Dashboard Sub-pages

**Routes**: `/admin/dashboard/overview`, `revenue`, `activity`, etc.  
**Current Status**: PLACEHOLDER  
**Estimated Hours**: 8-10 hours total

**Recommendation**: Either implement with real data OR remove from routing and consolidate into main dashboard with tabs.

---

## 2. Critical Path Analysis

### Feature 1: Real-time Booking Calendar (CRITICAL)

**Prerequisites**:

- ✅ Booking API exists (LIVE)
- ❌ Studio API needs to be implemented
- ❌ Equipment availability calculation logic
- ❌ Buffer time handling (setup/cleanup)

**Current Blockers**:

```sql
-- Missing schema fields
ALTER TABLE studios ADD COLUMN setup_time_minutes INTEGER DEFAULT 30;
ALTER TABLE studios ADD COLUMN cleanup_time_minutes INTEGER DEFAULT 30;
ALTER TABLE bookings ADD COLUMN buffer_before INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN buffer_after INTEGER DEFAULT 0;
```

**Dependent Features**:

- Drag-and-drop rescheduling (Phase 2)
- Availability checker in booking form
- Resource utilization reports
- Conflict detection algorithm

**Implementation Complexity**: High (5-7 days)

**Recommended Library**: `@fullcalendar/react` with resource timeline

**Phase 1 (Week 1-2)**: Basic calendar with real data (completed in Quick Win #3)  
**Phase 2 (Week 3-4)**: Multi-resource view, filters by type  
**Phase 3 (Week 5-6)**: Drag-and-drop, conflict detection  
**Phase 4 (Week 7-8)**: Buffer times, setup/cleanup visualization

---

### Feature 2: Studios Module (CRITICAL)

**Current State**: PLACEHOLDER - entirely mock data

**Prerequisites**:

- ❌ Studio Prisma model complete (add missing fields)
- ❌ Studio API endpoints
- ❌ Image upload for floor plans
- ❌ Amenities relationship

**Database Changes Required**:

```prisma
// Add to schema.prisma
model Studio {
  id                      String    @id @default(cuid())
  name                    String
  description             String?   @db.Text
  location                String?
  capacity                Int?
  size                    Decimal?  @db.Decimal(10, 2) // square meters
  hourlyRate              Decimal   @db.Decimal(10, 2)
  dailyRate               Decimal?  @db.Decimal(10, 2)
  weeklyRate              Decimal?  @db.Decimal(10, 2)

  // NEW FIELDS
  floorPlanUrl            String?
  setupTimeMinutes        Int       @default(30)
  cleanupTimeMinutes      Int       @default(30)
  securityDepositAmount   Decimal   @db.Decimal(10, 2) @default(0)
  cancellationPolicyId    String?
  peakHourMultiplier      Decimal?  @db.Decimal(3, 2) // e.g., 1.5 = 150%
  offPeakDiscount         Decimal?  @db.Decimal(3, 2)
  overtimeRate            Decimal?  @db.Decimal(10, 2)

  status                  StudioStatus @default(ACTIVE)
  amenities               StudioAmenity[]
  bookings                Booking[]

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

model StudioAmenity {
  id          String  @id @default(cuid())
  studioId    String
  studio      Studio  @relation(fields: [studioId], references: [id], onDelete: Cascade)
  name        String
  category    String? // LIGHTING, AUDIO, SEATING, etc.
  included    Boolean @default(true)
  extraCharge Decimal? @db.Decimal(10, 2)
  icon        String?
}

enum StudioStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
  COMING_SOON
}
```

**API Endpoints to Create**:

```typescript
// src/app/api/admin/studios/route.ts
GET    /api/admin/studios              // List all studios
POST   /api/admin/studios              // Create studio
GET    /api/admin/studios/:id          // Get studio detail
PATCH  /api/admin/studios/:id          // Update studio
DELETE /api/admin/studios/:id          // Delete studio

// Amenities
GET    /api/admin/studios/:id/amenities       // List amenities
POST   /api/admin/studios/:id/amenities       // Add amenity
DELETE /api/admin/studios/:id/amenities/:aid  // Remove amenity

// Availability
GET    /api/admin/studios/:id/availability    // Check availability for date range
GET    /api/admin/studios/available           // Find available studios for criteria
```

**Implementation Roadmap**:

**Week 1**: Database + Basic CRUD

```typescript
// Example: Studios list API
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const capacity = searchParams.get('minCapacity')

  const studios = await prisma.studio.findMany({
    where: {
      ...(status && { status: status as StudioStatus }),
      ...(capacity && { capacity: { gte: parseInt(capacity) } }),
    },
    include: {
      amenities: true,
      _count: {
        select: { bookings: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(studios)
}
```

**Week 2**: UI Pages

- Studios list page with filters (status, capacity, location)
- Studio detail page with tabs (Overview, Amenities, Bookings, Analytics)
- Create/Edit studio form with image upload

**Week 3**: Amenities & Floor Plans

- Amenity management UI
- Floor plan upload (use S3 or similar)
- Image gallery component

**Week 4**: Booking Integration

- Connect studios to booking flow
- Availability checker
- Pricing calculator with peak/off-peak

---

### Feature 3: Equipment Maintenance Log

**Prerequisites**:

- ✅ Equipment model exists
- ❌ MaintenanceLog model
- ❌ Maintenance scheduling logic

**Database Schema**:

```prisma
model MaintenanceLog {
  id                String           @id @default(cuid())
  equipmentId       String
  equipment         Equipment        @relation(fields: [equipmentId], references: [id])

  maintenanceDate   DateTime
  type              MaintenanceType
  description       String           @db.Text
  cost              Decimal          @db.Decimal(10, 2)

  technicianName    String?
  technicianId      String?
  technician        User?            @relation(fields: [technicianId], references: [id])

  nextServiceDate   DateTime?
  status            MaintenanceStatus @default(SCHEDULED)

  notes             String?          @db.Text
  attachments       Json?            // URLs to photos/documents

  createdBy         String
  creator           User             @relation("CreatedMaintenance", fields: [createdBy], references: [id])

  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}

enum MaintenanceType {
  ROUTINE
  REPAIR
  INSPECTION
  UPGRADE
  EMERGENCY
  CALIBRATION
}

enum MaintenanceStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

**API Endpoints**:

```typescript
GET    /api/admin/equipment/:id/maintenance       // List for equipment
POST   /api/admin/maintenance                     // Create maintenance record
PATCH  /api/admin/maintenance/:id                 // Update
DELETE /api/admin/maintenance/:id                 // Delete
GET    /api/admin/maintenance/upcoming            // Get all upcoming maintenance
GET    /api/admin/maintenance/overdue             // Get overdue maintenance
```

**Implementation** (Week 5-6):

1. Create migration for MaintenanceLog model
2. Build API routes
3. Add "Maintenance" tab to equipment detail page
4. Create maintenance calendar view
5. Add automated reminders (when `nextServiceDate` approaches)

---

### Feature 4: Damage Claims System

**Purpose**: Track equipment damage, calculate costs, resolve disputes

**Database Schema**:

```prisma
model DamageClaim {
  id              String        @id @default(cuid())
  bookingId       String
  booking         Booking       @relation(fields: [bookingId], references: [id])

  equipmentId     String?
  equipment       Equipment?    @relation(fields: [equipmentId], references: [id])

  studioId        String?
  studio          Studio?       @relation(fields: [studioId], references: [id])

  reportedBy      String
  reporter        User          @relation(fields: [reportedBy], references: [id])

  damageType      DamageType
  severity        DamageSeverity
  description     String        @db.Text

  photos          Json?         // Array of photo URLs

  estimatedCost   Decimal       @db.Decimal(10, 2)
  actualCost      Decimal?      @db.Decimal(10, 2)

  status          ClaimStatus   @default(PENDING)
  resolution      String?       @db.Text
  resolvedBy      String?
  resolver        User?         @relation("ResolvedClaims", fields: [resolvedBy], references: [id])
  resolvedAt      DateTime?

  customerNotified Boolean      @default(false)
  insuranceClaim   Boolean      @default(false)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum DamageType {
  PHYSICAL_DAMAGE
  MALFUNCTION
  MISSING_PARTS
  EXCESSIVE_WEAR
  LOSS
  OTHER
}

enum DamageSeverity {
  MINOR       // Cosmetic, doesn't affect function
  MODERATE    // Requires repair but usable
  SEVERE      // Not usable, needs major repair
  TOTAL_LOSS  // Beyond repair
}

enum ClaimStatus {
  PENDING
  INVESTIGATING
  APPROVED
  REJECTED
  RESOLVED
  DISPUTED
}
```

**API Routes**:

```typescript
POST   /api/admin/damage-claims              // Create claim
GET    /api/admin/damage-claims              // List all claims
GET    /api/admin/damage-claims/:id          // Get detail
PATCH  /api/admin/damage-claims/:id          // Update claim
POST   /api/admin/damage-claims/:id/resolve  // Resolve claim
GET    /api/admin/bookings/:id/damage-claims // Get claims for booking
```

**UI Flow**:

1. From booking detail → "Report Damage" button
2. Form: Select equipment, damage type, upload photos, estimate cost
3. Claims list with filters (status, severity, date range)
4. Claim detail page with resolution workflow
5. Notification to customer when claim approved/rejected

**Implementation** (Week 7-8)

---

## 3. Data Model Gap Analysis

### Missing Table: Equipment Categories (Hierarchical)

**Purpose**: Organize equipment with nested categories (e.g., Cameras → DSLR → Full Frame)

```prisma
model EquipmentCategory {
  id          String              @id @default(cuid())
  name        String
  slug        String              @unique
  description String?             @db.Text
  icon        String?

  parentId    String?
  parent      EquipmentCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    EquipmentCategory[] @relation("CategoryHierarchy")

  equipment   Equipment[]

  sortOrder   Int                 @default(0)
  isActive    Boolean             @default(true)

  // Pricing defaults for category
  defaultDailyRate   Decimal? @db.Decimal(10, 2)
  defaultWeeklyRate  Decimal? @db.Decimal(10, 2)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([parentId])
  @@index([sortOrder])
}
```

**Migration Priority**: High  
**Estimated Time**: 2-3 days (schema + API + UI)

---

### Missing Table: Pricing Rules Engine

**Purpose**: Dynamic pricing based on season, demand, duration, customer segment

```prisma
model PricingRule {
  id              String        @id @default(cuid())
  name            String
  description     String?       @db.Text

  ruleType        PricingRuleType
  priority        Int           @default(0) // Higher = applies first

  // Conditions
  conditions      Json          // Complex conditions as JSON
  /* Example conditions structure:
  {
    "dateRange": { "start": "2024-12-20", "end": "2025-01-05" },
    "daysOfWeek": [5, 6, 7], // Friday, Saturday, Sunday
    "minDuration": 3, // days
    "customerSegments": ["VIP", "CORPORATE"],
    "equipmentCategories": ["cat_123", "cat_456"],
    "studioIds": ["studio_1"]
  }
  */

  // Action
  adjustmentType  PriceAdjustmentType // PERCENTAGE, FIXED, REPLACE
  adjustmentValue Decimal       @db.Decimal(10, 2)

  isActive        Boolean       @default(true)

  validFrom       DateTime?
  validUntil      DateTime?

  createdBy       String
  creator         User          @relation(fields: [createdBy], references: [id])

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([priority])
  @@index([isActive])
}

enum PricingRuleType {
  SEASONAL        // Holiday pricing
  DEMAND_BASED    // High demand = higher price
  DURATION        // Longer rental = discount
  CUSTOMER        // VIP discount
  EARLY_BIRD      // Book X days ahead = discount
  BUNDLE          // Multi-item discount
}

enum PriceAdjustmentType {
  PERCENTAGE      // +20% or -15%
  FIXED           // +$50 or -$25
  REPLACE         // Set to exact amount
}
```

**Pricing Calculation Algorithm**:

```typescript
// src/lib/pricing-engine.ts
export async function calculatePrice(params: {
  equipmentIds?: string[]
  studioId?: string
  startDate: Date
  endDate: Date
  customerId: string
}) {
  // 1. Get base prices
  const basePrices = await getBasePrices(params)

  // 2. Fetch applicable pricing rules (ordered by priority)
  const rules = await prisma.pricingRule.findMany({
    where: {
      isActive: true,
      OR: [
        { validFrom: null, validUntil: null },
        { validFrom: { lte: params.startDate }, validUntil: { gte: params.endDate } },
      ],
    },
    orderBy: { priority: 'desc' },
  })

  // 3. Apply rules in sequence
  let finalPrice = basePrices.total
  const appliedRules = []

  for (const rule of rules) {
    if (ruleApplies(rule, params)) {
      finalPrice = applyAdjustment(finalPrice, rule)
      appliedRules.push({
        rule: rule.name,
        adjustment: rule.adjustmentValue,
      })
    }
  }

  return {
    basePrice: basePrices.total,
    finalPrice,
    breakdown: basePrices.breakdown,
    appliedRules,
  }
}

function ruleApplies(rule: PricingRule, params: any): boolean {
  const conditions = rule.conditions as any

  // Check date range
  if (conditions.dateRange) {
    const start = new Date(conditions.dateRange.start)
    const end = new Date(conditions.dateRange.end)
    if (params.startDate < start || params.startDate > end) {
      return false
    }
  }

  // Check days of week
  if (conditions.daysOfWeek?.length) {
    const dayOfWeek = params.startDate.getDay()
    if (!conditions.daysOfWeek.includes(dayOfWeek)) {
      return false
    }
  }

  // Check minimum duration
  if (conditions.minDuration) {
    const days = differenceInDays(params.endDate, params.startDate)
    if (days < conditions.minDuration) {
      return false
    }
  }

  // Check customer segment
  if (conditions.customerSegments?.length) {
    // Fetch customer and check segment
    // ...
  }

  return true
}
```

**Implementation**: Week 9-11

---

### Missing Table: Customer Segments

**Purpose**: Group customers for targeted pricing, marketing, terms

```prisma
model CustomerSegment {
  id              String    @id @default(cuid())
  name            String    @unique
  slug            String    @unique
  description     String?   @db.Text

  // Benefits
  discountPercent Decimal?  @db.Decimal(5, 2) // e.g., 10.00 = 10%
  priorityBooking Boolean   @default(false)
  extendedTerms   Boolean   @default(false) // Longer payment terms

  // Criteria (auto-assign or manual)
  autoAssignRules Json?
  /* Example:
  {
    "minLifetimeValue": 10000,
    "minBookings": 10,
    "avgBookingValue": 500
  }
  */

  customers       Customer[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Add to Customer model
model Customer {
  // ... existing fields

  segmentId       String?
  segment         CustomerSegment? @relation(fields: [segmentId], references: [id])

  lifetimeValue   Decimal          @db.Decimal(10, 2) @default(0)
  riskScore       Int?             // 0-100, higher = riskier
  creditLimit     Decimal?         @db.Decimal(10, 2)

  verificationStatus VerificationStatus @default(UNVERIFIED)
  isBlacklisted   Boolean          @default(false)
  blacklistReason String?          @db.Text
}

enum VerificationStatus {
  UNVERIFIED
  PENDING
  VERIFIED
  REJECTED
}
```

**Auto-assignment Job** (runs nightly):

```typescript
// src/jobs/auto-assign-segments.ts
export async function autoAssignCustomerSegments() {
  const segments = await prisma.customerSegment.findMany({
    where: { autoAssignRules: { not: null } },
  })

  for (const segment of segments) {
    const rules = segment.autoAssignRules as any

    const customers = await prisma.customer.findMany({
      where: {
        segmentId: null, // Not already assigned
        lifetimeValue: { gte: rules.minLifetimeValue || 0 },
        _count: {
          bookings: { gte: rules.minBookings || 0 },
        },
      },
    })

    // Assign segment
    await prisma.customer.updateMany({
      where: { id: { in: customers.map((c) => c.id) } },
      data: { segmentId: segment.id },
    })
  }
}
```

**Implementation**: Week 12-13

---

### Missing Table: Notification Templates

**Purpose**: Customizable email/SMS templates for all automated communications

```prisma
model NotificationTemplate {
  id          String            @id @default(cuid())
  name        String
  slug        String            @unique
  description String?           @db.Text

  trigger     NotificationTrigger
  channel     NotificationChannel

  subject     String?           // For email
  bodyText    String            @db.Text
  bodyHtml    String?           @db.Text

  // Variables that can be used
  variables   Json              // e.g., ["customerName", "bookingId", "totalAmount"]

  isActive    Boolean           @default(true)
  language    String            @default("en")

  // For A/B testing
  variant     String?

  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([slug, language])
}

enum NotificationTrigger {
  BOOKING_CONFIRMED
  BOOKING_REMINDER
  PAYMENT_RECEIVED
  PAYMENT_FAILED
  EQUIPMENT_READY
  DELIVERY_SCHEDULED
  RETURN_REMINDER
  RETURN_OVERDUE
  DAMAGE_CLAIM_FILED
  INVOICE_SENT
  REVIEW_REQUEST
}

enum NotificationChannel {
  EMAIL
  SMS
  PUSH
  IN_APP
}
```

**Template Rendering Example**:

```typescript
// src/lib/notifications.ts
import Handlebars from 'handlebars'

export async function sendNotification(
  trigger: NotificationTrigger,
  recipientId: string,
  data: Record<string, any>
) {
  const template = await prisma.notificationTemplate.findUnique({
    where: {
      slug_language: {
        slug: trigger.toLowerCase(),
        language: 'en',
      },
    },
  })

  if (!template || !template.isActive) {
    console.warn(`No active template for ${trigger}`)
    return
  }

  // Compile template
  const compiledSubject = Handlebars.compile(template.subject || '')
  const compiledBody = Handlebars.compile(template.bodyText)

  const subject = compiledSubject(data)
  const body = compiledBody(data)

  // Send based on channel
  if (template.channel === 'EMAIL') {
    await sendEmail({
      to: data.recipientEmail,
      subject,
      html: template.bodyHtml ? Handlebars.compile(template.bodyHtml)(data) : body,
    })
  } else if (template.channel === 'SMS') {
    await sendSMS({
      to: data.recipientPhone,
      message: body,
    })
  }
}
```

**Admin UI**:

- Template list with filters (trigger, channel, active)
- Template editor with variable picker
- Preview with sample data
- Version history
- A/B test comparison

**Implementation**: Week 14-15

---

## 4. Studio Module - Complete Implementation Plan

### Phase 1: Database & Basic CRUD (Week 1)

**Day 1-2**: Schema & Migration

```bash
# Run migration
npx prisma migrate dev --name add_studio_enhancements

# Seed some sample studios
npx prisma db seed
```

**Day 3-4**: API Routes

- GET /api/admin/studios (with filters)
- POST /api/admin/studios
- GET /api/admin/studios/:id
- PATCH /api/admin/studios/:id
- DELETE /api/admin/studios/:id

**Day 5**: Testing

- Unit tests for API routes
- Test data validation
- Test error handling

---

### Phase 2: UI Components (Week 2)

**Studios List Page** (`/admin/studios`):

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

export default function StudiosPage() {
  const [filters, setFilters] = useState({
    status: 'all',
    minCapacity: null
  });

  const { data: studios, isLoading } = useQuery({
    queryKey: ['studios', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.minCapacity) params.set('minCapacity', filters.minCapacity);

      const res = await fetch(`/api/admin/studios?${params}`);
      return res.json();
    }
  });

  const columns = [
    {
      accessorKey: 'name',
      header: 'Studio Name',
      cell: ({ row }) => (
        <Link href={`/admin/studios/${row.original.id}`}>
          {row.getValue('name')}
        </Link>
      )
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => `${row.getValue('capacity')} people`
    },
    {
      accessorKey: 'hourlyRate',
      header: 'Hourly Rate',
      cell: ({ row }) => formatCurrency(row.getValue('hourlyRate'))
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={
            status === 'ACTIVE' ? 'success' :
            status === 'MAINTENANCE' ? 'warning' :
            'secondary'
          }>
            {status}
          </Badge>
        );
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          {/* Edit, Delete, View Bookings, etc. */}
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1>Studios</h1>
        <Button onClick={() => router.push('/admin/studios/new')}>
          + Add Studio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Min capacity"
          value={filters.minCapacity || ''}
          onChange={(e) => setFilters({...filters, minCapacity: e.target.value})}
          className="w-[200px]"
        />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={studios || []} />
    </div>
  );
}
```

---

### Phase 3: Amenities & Floor Plans (Week 3)

**Amenities Component**:

```typescript
function AmenitiesManager({ studioId }: { studioId: string }) {
  const { data: amenities } = useQuery({
    queryKey: ['studio-amenities', studioId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/studios/${studioId}/amenities`);
      return res.json();
    }
  });

  const addAmenity = useMutation({
    mutationFn: async (data: AmenityInput) => {
      const res = await fetch(`/api/admin/studios/${studioId}/amenities`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studio-amenities', studioId]);
      toast.success('Amenity added');
    }
  });

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <CardTitle>Amenities</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">+ Add Amenity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Add Amenity</DialogTitle>
            <AmenityForm onSubmit={addAmenity.mutate} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {amenities?.map(amenity => (
            <Card key={amenity.id}>
              <CardContent className="flex justify-between items-center p-4">
                <div className="flex items-center gap-2">
                  {amenity.icon && <Icon name={amenity.icon} />}
                  <div>
                    <p className="font-medium">{amenity.name}</p>
                    <p className="text-sm text-muted">{amenity.category}</p>
                  </div>
                </div>
                <Badge>
                  {amenity.included ? 'Included' : formatCurrency(amenity.extraCharge)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Floor Plan Upload**:

```typescript
async function uploadFloorPlan(file: File, studioId: string) {
  // 1. Upload to S3 or similar
  const formData = new FormData()
  formData.append('file', file)

  const uploadRes = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const { url } = await uploadRes.json()

  // 2. Update studio with floor plan URL
  await fetch(`/api/admin/studios/${studioId}`, {
    method: 'PATCH',
    body: JSON.stringify({ floorPlanUrl: url }),
  })

  toast.success('Floor plan uploaded')
}
```

---

### Phase 4: Booking Integration (Week 4)

**Availability Checker API**:

```typescript
// /api/admin/studios/[id]/availability/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const start = new Date(searchParams.get('start')!)
  const end = new Date(searchParams.get('end')!)

  const studio = await prisma.studio.findUnique({
    where: { id: params.id },
    select: {
      setupTimeMinutes: true,
      cleanupTimeMinutes: true,
    },
  })

  // Get all bookings in date range
  const bookings = await prisma.booking.findMany({
    where: {
      studioId: params.id,
      status: { in: ['CONFIRMED', 'ACTIVE'] },
      AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
    },
    orderBy: { startDate: 'asc' },
  })

  // Calculate unavailable slots (including buffer times)
  const unavailableSlots = bookings.map((booking) => ({
    start: subMinutes(booking.startDate, studio.setupTimeMinutes),
    end: addMinutes(booking.endDate, studio.cleanupTimeMinutes),
  }))

  // Find available slots
  const availableSlots = calculateAvailableSlots(start, end, unavailableSlots)

  return NextResponse.json({
    available: availableSlots.length > 0,
    slots: availableSlots,
    bookedSlots: unavailableSlots,
  })
}
```

---

## 5. Feature Flag Strategy

### Implementation using Feature Flags Service

```typescript
// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  ADVANCED_CALENDAR: 'enable_advanced_calendar',
  DAMAGE_CLAIMS: 'enable_damage_claims',
  PRICING_RULES: 'enable_pricing_rules',
  AI_KIT_BUILDER: 'enable_ai_kit_builder',
  CUSTOMER_SEGMENTS: 'enable_customer_segments',
  NOTIFICATION_TEMPLATES: 'enable_notification_templates',
  STUDIO_MODULE: 'enable_studio_module',
  MAINTENANCE_LOG: 'enable_maintenance_log',
  LIVE_CHAT: 'enable_live_chat',
} as const;

export async function isFeatureEnabled(
  flag: keyof typeof FEATURE_FLAGS,
  userId?: string
): Promise<boolean> {
  // Check database for feature flag status
  const feature = await prisma.featureFlag.findUnique({
    where: { key: FEATURE_FLAGS[flag] }
  });

  if (!feature || !feature.enabled) return false;

  // Check rollout percentage
  if (feature.rolloutPercent < 100) {
    // Use consistent hashing for gradual rollout
    if (userId) {
      const hash = hashString(userId);
      return (hash % 100) < feature.rolloutPercent;
    }
    return false;
  }

  return true;
}

// In components
function CalendarPage() {
  const { data: isEnabled } = useQuery({
    queryKey: ['feature-flag', 'ADVANCED_CALENDAR'],
    queryFn: () => isFeatureEnabled('ADVANCED_CALENDAR')
  });

  if (!isEnabled) {
    return <BasicCalendar />;
  }

  return <AdvancedCalendar />;
}
```

### Rollout Plan Template

**Feature: Damage Claims System**

| Week | Rollout % | Audience         | Monitoring                   |
| ---- | --------- | ---------------- | ---------------------------- |
| 1    | 0%        | Internal QA only | Bug reports, performance     |
| 2    | 10%       | Beta admin users | User feedback, error rates   |
| 3    | 25%       | Early adopters   | Feature usage analytics      |
| 4    | 50%       | Half of admins   | Load testing, DB performance |
| 5    | 75%       | Majority         | Final stability checks       |
| 6    | 100%      | All users        | Full monitoring              |

---

## 6. API Endpoint Inventory

### Command Center Section

**Existing**:

- ✅ GET /api/admin/dashboard - Main dashboard KPIs
- ✅ GET /api/admin/action-center - Action items (partial)

**Missing**:

- ❌ GET /api/admin/approvals - List pending approvals
- ❌ POST /api/admin/approvals/:id/approve
- ❌ POST /api/admin/approvals/:id/reject
- ❌ GET /api/admin/live-ops - Real-time operations dashboard

**Priority**: Approvals endpoints (Week 1)

---

### Booking Engine Section

**Existing**:

- ✅ GET /api/admin/quotes - List quotes
- ✅ GET /api/admin/quotes/:id - Quote detail
- ✅ POST /api/admin/quotes - Create quote
- ✅ POST /api/admin/quotes/:id/convert - Convert to booking
- ✅ GET /api/admin/bookings - List bookings
- ✅ GET /api/admin/bookings/:id - Booking detail
- ✅ POST /api/admin/bookings - Create booking
- ✅ PATCH /api/admin/bookings/:id - Update booking

**Missing**:

- ❌ GET /api/admin/calendar/events - Calendar events feed
- ❌ POST /api/admin/bookings/:id/reschedule - Drag-drop rescheduling
- ❌ GET /api/admin/bookings/recurring - Recurring bookings
- ❌ POST /api/admin/bookings/recurring - Create recurring
- ❌ GET /api/admin/waitlist - Waitlist entries
- ❌ POST /api/admin/waitlist - Add to waitlist
- ❌ POST /api/admin/bookings/:id/extend - Extend booking

**Priority**: Calendar events, Extend booking (Week 3-4)

---

### Inventory & Assets Section

**Existing**:

- ✅ GET /api/admin/inventory/equipment
- ✅ POST /api/admin/inventory/equipment
- ✅ GET /api/admin/inventory/equipment/:id
- ✅ PATCH /api/admin/inventory/equipment/:id
- ✅ POST /api/admin/inventory/import - Bulk import
- ✅ GET /api/admin/inventory/brands

**Missing**:

- ❌ GET /api/admin/inventory/categories - Hierarchical categories
- ❌ POST /api/admin/inventory/categories
- ❌ PATCH /api/admin/inventory/categories/:id
- ❌ GET /api/admin/inventory/stock-adjustments
- ❌ POST /api/admin/inventory/stock-adjustments
- ❌ GET /api/admin/inventory/kits - Equipment bundles
- ❌ POST /api/admin/inventory/kits
- ❌ GET /api/admin/inventory/export - Export to CSV
- ❌ GET /api/admin/equipment/:id/qr-code - Generate QR
- ❌ GET /api/admin/studios - Studios list
- ❌ POST /api/admin/studios
- ❌ GET /api/admin/studios/:id
- ❌ PATCH /api/admin/studios/:id
- ❌ DELETE /api/admin/studios/:id
- ❌ GET /api/admin/studios/:id/amenities
- ❌ POST /api/admin/studios/:id/amenities

**Priority**: Studios CRUD (Week 1-2), Categories (Week 3)

---

### Field Operations Section

**Existing**:

- ✅ GET /api/admin/ops/warehouse - Warehouse queues
- ✅ GET /api/admin/ops/delivery - Deliveries
- ✅ GET /api/admin/maintenance - Maintenance list

**Missing**:

- ❌ POST /api/admin/ops/warehouse/check-out - Process checkout
- ❌ POST /api/admin/ops/warehouse/check-in - Process check-in
- ❌ GET /api/admin/equipment/:id/maintenance - Maintenance history
- ❌ POST /api/admin/maintenance - Create maintenance record
- ❌ PATCH /api/admin/maintenance/:id
- ❌ GET /api/admin/maintenance/upcoming
- ❌ GET /api/admin/maintenance/overdue
- ❌ POST /api/admin/damage-claims - Report damage
- ❌ GET /api/admin/damage-claims
- ❌ PATCH /api/admin/damage-claims/:id
- ❌ POST /api/admin/damage-claims/:id/resolve
- ❌ GET /api/admin/ops/delivery/routes - Route planning
- ❌ PATCH /api/admin/ops/delivery/:id/assign - Assign driver

**Priority**: Maintenance endpoints (Week 5-6), Damage claims (Week 7-8)

---

### Finance & Legal Section

**Existing**:

- ✅ GET /api/admin/invoices
- ✅ GET /api/admin/invoices/:id
- ✅ GET /api/admin/payments
- ✅ GET /api/admin/contracts
- ✅ GET /api/admin/finance/reports

**Missing**:

- ❌ POST /api/admin/invoices - Generate invoice
- ❌ POST /api/admin/invoices/:id/send - Email invoice
- ❌ GET /api/admin/invoices/:id/pdf - Download PDF
- ❌ POST /api/admin/deposits - Record deposit
- ❌ POST /api/admin/deposits/:id/refund - Process refund
- ❌ GET /api/admin/pricing-rules
- ❌ POST /api/admin/pricing-rules
- ❌ POST /api/admin/pricing/calculate - Calculate with rules
- ❌ GET /api/admin/tax-config
- ❌ POST /api/admin/tax-config
- ❌ GET /api/admin/finance/reports/export - Export financial report

**Priority**: Pricing rules (Week 9-10), Invoice PDF (Week 11)

---

### CRM & Marketing Section

**Existing**:

- ✅ GET /api/admin/clients
- ✅ GET /api/admin/clients/:id
- ✅ POST /api/admin/clients
- ✅ GET /api/admin/coupons
- ✅ POST /api/admin/coupons
- ✅ GET /api/admin/marketing - Campaigns list

**Missing**:

- ❌ GET /api/admin/clients/:id/rental-history
- ❌ POST /api/admin/clients/:id/verification - Upload docs
- ❌ PATCH /api/admin/clients/:id/verification - Approve/reject
- ❌ GET /api/admin/customer-segments
- ❌ POST /api/admin/customer-segments
- ❌ POST /api/admin/customer-segments/auto-assign - Run assignment
- ❌ GET /api/admin/reviews
- ❌ PATCH /api/admin/reviews/:id - Moderate review
- ❌ POST /api/admin/reviews/:id/respond - Reply to review
- ❌ GET /api/admin/referrals
- ❌ POST /api/admin/referrals
- ❌ GET /api/admin/loyalty/points/:customerId
- ❌ POST /api/admin/loyalty/points - Award points

**Priority**: Customer segments (Week 12-13), Reviews (Week 16)

---

### Settings Section

**Existing**:

- ✅ GET /api/admin/settings/integrations
- ✅ GET /api/admin/settings/features

**Missing**:

- ❌ GET /api/admin/settings/business
- ❌ PATCH /api/admin/settings/business
- ❌ GET /api/admin/settings/operating-hours
- ❌ PATCH /api/admin/settings/operating-hours
- ❌ GET /api/admin/settings/policies
- ❌ POST /api/admin/settings/policies
- ❌ GET /api/admin/settings/roles
- ❌ POST /api/admin/settings/roles
- ❌ PATCH /api/admin/settings/roles/:id
- ❌ GET /api/admin/settings/notification-templates
- ❌ POST /api/admin/settings/notification-templates
- ❌ PATCH /api/admin/settings/notification-templates/:id
- ❌ GET /api/admin/settings/audit-log
- ❌ GET /api/admin/settings/backup
- ❌ POST /api/admin/settings/restore

**Priority**: Roles (Week 13), Notification templates (Week 14-15)

---

## 7. UX/UI Consistency Audit

### Inconsistent Patterns Found

**Problem 1: Mixed Date Handling**

- Some pages use date-fns, others use moment.js, some use native Date
- **Fix**: Standardize on date-fns across all components

```typescript
// Create utility file: src/lib/date-utils.ts
import { format, parseISO, formatDistance } from 'date-fns'
import { enUS, ar } from 'date-fns/locale'

export function formatDate(date: Date | string, formatStr = 'PP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: getCurrentLocale() })
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'PPp')
}

export function formatRelative(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true })
}

// Use everywhere
// {formatDate(booking.createdAt)} // "Jan 15, 2025"
// {formatRelative(booking.createdAt)} // "2 hours ago"
```

---

**Problem 2: Inconsistent Form Validation**

- Some forms use react-hook-form + zod
- Others use manual validation
- **Fix**: Standardize on react-hook-form + zod

```typescript
// Create form schema: src/schemas/studio.schema.ts
import { z } from 'zod';

export const studioSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  capacity: z.number().int().positive('Capacity must be positive'),
  hourlyRate: z.number().positive('Rate must be positive'),
  setupTimeMinutes: z.number().int().min(0).default(30),
  cleanupTimeMinutes: z.number().int().min(0).default(30),
});

export type StudioInput = z.infer<typeof studioSchema>;

// Use in forms
function StudioForm() {
  const form = useForm<StudioInput>({
    resolver: zodResolver(studioSchema),
    defaultValues: { setupTimeMinutes: 30, cleanupTimeMinutes: 30 }
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Studio Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* ... */}
    </Form>
  );
}
```

---

**Problem 3: Inconsistent Loading States**

- Some pages show skeleton loaders
- Others show spinners
- Some show nothing
- **Fix**: Create reusable loading components

```typescript
// src/components/ui/table-skeleton.tsx
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Usage
function EquipmentList() {
  const { data, isLoading } = useQuery(/* ... */);

  if (isLoading) return <TableSkeleton rows={10} columns={5} />;

  return <DataTable data={data} />;
}
```

---

**Problem 4: Missing Empty States**

- Many tables/lists show nothing when empty
- **Fix**: Create EmptyState component

```typescript
// src/components/ui/empty-state.tsx
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage
function StudiosList() {
  if (studios.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No studios yet"
        description="Get started by creating your first studio space"
        action={{
          label: "Add Studio",
          onClick: () => router.push('/admin/studios/new')
        }}
      />
    );
  }

  return <DataTable data={studios} />;
}
```

---

### Missing Reusable Components

**Need to Create**:

1. **DataTable with Server-Side Sorting/Filtering**
2. **StatusBadge** (consistent status displays)
3. **CurrencyInput** (formatted currency input)
4. **ImageUploader** (drag-drop with preview)
5. **ConfirmDialog** (consistent confirmation modals)

---

### Accessibility Issues

**Issues Found**:

- ❌ Many buttons lack aria-labels
- ❌ Modals don't trap focus
- ❌ Tables missing proper headers
- ❌ Color-only indicators (status colors)
- ❌ Forms missing fieldset/legend

---

## 8. Performance Optimization Opportunities

### Issue 1: Equipment List Page (Slow Query)

**Problem**: Loading 500+ equipment items with all relationships  
**Impact**: 3-5 second page load  
**Root Cause**: No pagination, eager loading all fields

**Optimized Query**:

```typescript
const equipment = await prisma.equipment.findMany({
  take: 50,
  skip: (page - 1) * 50,
  where: filters,
  select: {
    id: true,
    name: true,
    sku: true,
    status: true,
    dailyRate: true,
    condition: true,
    category: {
      select: { id: true, name: true },
    },
    brand: {
      select: { id: true, name: true },
    },
    // Don't load bookings or maintenance logs
  },
  orderBy: { name: 'asc' },
})
```

**Expected Improvement**: < 500ms page load

---

### Issue 2: Dashboard KPIs (N+1 Queries)

**Problem**: Each KPI card makes separate database query  
**Impact**: 8-10 sequential queries on dashboard load

**Optimized** (single query with aggregations):

```typescript
const [bookingStats, revenueStats, customerCount] = await Promise.all([
  prisma.booking.groupBy({
    by: ['status'],
    _count: true,
    where: { createdAt: { gte: startOfMonth } },
  }),
  prisma.payment.aggregate({
    _sum: { amount: true },
    where: { createdAt: { gte: startOfMonth } },
  }),
  prisma.customer.count(),
])
```

**Expected Improvement**: Dashboard loads in 1-2 queries instead of 8-10

---

## 9. Security & Authorization Review

### Required Permission Levels (Proposed)

```typescript
enum Permission {
  // Equipment
  EQUIPMENT_VIEW = 'equipment:view',
  EQUIPMENT_CREATE = 'equipment:create',
  EQUIPMENT_EDIT = 'equipment:edit',
  EQUIPMENT_DELETE = 'equipment:delete',

  // Studios
  STUDIO_VIEW = 'studio:view',
  STUDIO_MANAGE = 'studio:manage',

  // Bookings
  BOOKING_VIEW = 'booking:view',
  BOOKING_CREATE = 'booking:create',
  BOOKING_APPROVE = 'booking:approve',
  BOOKING_CANCEL = 'booking:cancel',

  // Financial
  INVOICE_VIEW = 'invoice:view',
  INVOICE_CREATE = 'invoice:create',
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_PROCESS = 'payment:process',
  FINANCIAL_REPORTS = 'reports:financial',

  // Customers
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_EDIT = 'customer:edit',
  CUSTOMER_DELETE = 'customer:delete',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_MANAGE = 'settings:manage',
  USER_MANAGE = 'user:manage',
  ROLE_MANAGE = 'role:manage',

  // Maintenance
  MAINTENANCE_VIEW = 'maintenance:view',
  MAINTENANCE_CREATE = 'maintenance:create',

  // Claims
  DAMAGE_CLAIM_CREATE = 'claim:create',
  DAMAGE_CLAIM_RESOLVE = 'claim:resolve',
}
```

---

## 10. Testing Strategy

### Test Coverage Goals

- **Unit Tests**: 80% coverage for business logic
- **Integration Tests**: All API routes
- **E2E Tests**: Critical user flows

---

## 11. Sprint Planning (24 Weeks / 12 Sprints)

### Sprint 1-2 (Weeks 1-4): Foundation & Studios

**Goals**:

- Quick wins (Approvals, Brands, Calendar with real data)
- Studios module LIVE
- Categories implementation

**Tasks**:

- [ ] Wire Approvals API (4h)
- [ ] Connect Brands to database (3h)
- [ ] Replace Calendar mock data (6h)
- [ ] Create Studio schema + migration (4h)
- [ ] Build Studios CRUD API (8h)
- [ ] Studios list & detail pages (12h)
- [ ] Amenities management (8h)
- [ ] Floor plan upload (4h)
- [ ] Equipment categories API + UI (8h)
- [ ] Testing (8h)

**Deliverables**:

- Studios fully functional
- Calendar shows real bookings
- Equipment categories live

---

### Sprint 3-4 (Weeks 5-8): Booking Enhancements

**Goals**:

- Advanced calendar features
- Maintenance logging
- Damage claims system

**Tasks**:

- [ ] Multi-resource calendar view (12h)
- [ ] Buffer time handling (6h)
- [ ] Drag-and-drop rescheduling (16h)
- [ ] Conflict detection algorithm (8h)
- [ ] Maintenance log schema + API (8h)
- [ ] Maintenance UI (10h)
- [ ] Damage claims schema + API (10h)
- [ ] Damage claims workflow (12h)
- [ ] Testing (10h)

**Deliverables**:

- Fully functional calendar with drag-drop
- Maintenance tracking live
- Damage claim system operational

---

### Sprint 5-6 (Weeks 9-12): Financial & Pricing

**Goals**:

- Pricing rules engine
- Enhanced financial reports
- Customer segments

**Tasks**:

- [ ] Pricing rules schema (6h)
- [ ] Pricing calculation engine (16h)
- [ ] Pricing rules admin UI (12h)
- [ ] Test pricing scenarios (6h)
- [ ] Customer segments schema + API (8h)
- [ ] Auto-assignment logic (6h)
- [ ] Segment management UI (10h)
- [ ] Financial reports enhancement (12h)
- [ ] Invoice PDF generation (8h)
- [ ] Deposit & refund workflow (10h)
- [ ] Tax configuration UI (6h)
- [ ] Testing (8h)

**Deliverables**:

- Dynamic pricing fully operational
- Customer segmentation live
- Complete financial reporting suite
- Automated invoice generation

---

### Sprint 7-8 (Weeks 13-16): Marketing & Customer Experience

**Goals**:

- Notification templates system
- Reviews & ratings
- Customer verification
- Enhanced CRM features

**Tasks**:

- [ ] Notification templates schema (4h)
- [ ] Template editor UI with Handlebars (12h)
- [ ] Email/SMS integration (8h)
- [ ] Template variable system (6h)
- [ ] Reviews & ratings schema + API (8h)
- [ ] Review moderation UI (8h)
- [ ] Customer verification workflow (10h)
- [ ] Document upload for verification (6h)
- [ ] Customer credit management (8h)
- [ ] Rental history enhancement (6h)
- [ ] Testing (10h)

**Deliverables**:

- Customizable notification system
- Review management operational
- Customer verification process
- Enhanced customer profiles

---

### Sprint 9-10 (Weeks 17-20): Analytics & Reporting

**Goals**:

- Business intelligence dashboard
- Utilization reports
- Customer analytics
- Revenue forecasting

**Tasks**:

- [ ] BI dashboard schema design (4h)
- [ ] Equipment utilization calculations (8h)
- [ ] Studio performance metrics (8h)
- [ ] Customer analytics (LTV, retention, churn) (10h)
- [ ] Booking trends analysis (8h)
- [ ] Revenue forecasting algorithm (12h)
- [ ] Interactive charts (Recharts/Chart.js) (12h)
- [ ] Export functionality (CSV/PDF/Excel) (8h)
- [ ] Custom report builder (16h)
- [ ] Scheduled reports (email automation) (8h)
- [ ] Testing (8h)

**Deliverables**:

- Executive BI dashboard
- Comprehensive utilization reports
- Customer insights dashboard
- Automated reporting system

---

### Sprint 11-12 (Weeks 21-24): Polish, Optimization & Advanced Features

**Goals**:

- Performance optimization
- Advanced booking features
- System polish and bug fixes
- Production readiness

**Week 21**: Performance Optimization

- [ ] Database query optimization (8h)
- [ ] Implement caching strategy (8h)
- [ ] Bundle size reduction (6h)
- [ ] Image optimization (4h)
- [ ] API response time improvements (6h)
- [ ] Load testing (6h)

**Week 22**: Advanced Booking Features

- [ ] Recurring bookings schema + API (10h)
- [ ] Recurring booking UI (8h)
- [ ] Waitlist system (8h)
- [ ] Equipment kits/bundles catalog (10h)
- [ ] Bundle pricing logic (6h)
- [ ] Booking extension workflow (6h)

**Week 23**: UX/UI Polish

- [ ] Accessibility audit and fixes (12h)
- [ ] Mobile responsiveness improvements (10h)
- [ ] Loading states standardization (6h)
- [ ] Empty states for all lists (6h)
- [ ] Error message consistency (4h)
- [ ] Form validation harmonization (6h)

**Week 24**: Final Polish & Production Prep

- [ ] Security audit (8h)
- [ ] Comprehensive testing (12h)
- [ ] Documentation (8h)
- [ ] Deployment checklist (8h)
- [ ] Bug fixes from QA (12h)
- [ ] Performance monitoring setup (4h)

**Deliverables**:

- Production-ready admin panel
- Optimized performance (<2s page loads)
- Complete feature set
- Comprehensive documentation

---

## 12. Timeline Overview

```
Week 1-2:   Quick Wins + Studios Foundation ✅
Week 3-4:   Studios Complete + Categories ✅
Week 5-6:   Maintenance + Claims System ✅
Week 7-8:   Advanced Calendar + Buffer Times ✅
Week 9-10:  Pricing Engine + Customer Segments ✅
Week 11-12: Financial Enhancement + Invoicing ✅
Week 13-14: Notification Templates ✅
Week 15-16: Reviews + Customer Verification ✅
Week 17-18: Analytics Dashboard ✅
Week 19-20: Advanced Reports + Export ✅
Week 21:    Performance Optimization ✅
Week 22:    Advanced Booking Features ✅
Week 23:    UX/UI Polish ✅
Week 24:    Production Launch 🚀
```

---

## 13. Success Metrics & KPIs

### Technical KPIs

| Metric              | Target | Critical Threshold |
| ------------------- | ------ | ------------------ |
| Page Load Time      | <2s    | >5s                |
| API Response Time   | <500ms | >2s                |
| Error Rate          | <0.5%  | >2%                |
| Uptime              | >99.9% | <99%               |
| Database Query Time | <100ms | >1s                |
| Bundle Size         | <500KB | >1MB               |
| Test Coverage       | >80%   | <60%               |

### Business KPIs

| Metric                       | Description                            | Target       |
| ---------------------------- | -------------------------------------- | ------------ |
| Booking Completion Rate      | % of bookings completed without errors | >95%         |
| Admin Efficiency             | Time to process approval/booking       | <2 min       |
| Equipment Utilization        | % of time equipment is rented          | >60%         |
| Studio Utilization           | % of studio hours booked               | >50%         |
| Revenue per Admin Hour       | Revenue generated per hour worked      | Increase 30% |
| Customer Satisfaction        | Based on reviews/feedback              | >4.5/5       |
| Damage Claim Resolution Time | Average days to resolve claim          | <3 days      |

---

## 14. Risk Management

### Critical Risks

| Risk               | Probability | Impact   | Mitigation                                     |
| ------------------ | ----------- | -------- | ---------------------------------------------- |
| Data Loss          | Low         | Critical | Daily backups, point-in-time recovery          |
| Third-Party Outage | Medium      | High     | Queue system, graceful degradation             |
| Performance Issues | Medium      | Medium   | Load testing, auto-scaling, caching            |
| Security Breach    | Low         | Critical | Security audit, regular updates, audit logging |

---

## Document Information

**Author**: Development Team  
**Last Updated**: February 3, 2026  
**Status**: Active Roadmap  
**Review Cycle**: Every 2 weeks (sprint boundaries)
