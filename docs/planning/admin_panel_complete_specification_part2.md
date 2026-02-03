# 📋 خطة شاملة ومفصلة لإكمال لوحة التحكم - الجزء الثاني

# 🗂️ القسم الثاني: Action Center & Approvals

## 2.1 `/admin/action-center` (جديد - حرج جداً)

### **الهدف:**
مركز القيادة للمهام العاجلة والتنبيهات

```typescript
ActionCenter {
  summary: {
    urgent: number
    high: number
    normal: number
    overdue: number
  }
  
  filters: {
    priority: "all" | "urgent" | "high" | "normal"
    type: "all" | "approval" | "alert" | "task"
    status: "all" | "pending" | "in_progress" | "completed"
    assignedTo: "me" | "unassigned" | "all"
    dateRange: DateRange
  }
  
  actions: ActionItem[]
  
  ActionItem: {
    id: string
    type: "approval" | "alert" | "task"
    priority: "urgent" | "high" | "normal"
    title: string
    description: string
    status: "pending" | "in_progress" | "completed"
    
    relatedEntity: {
      type: "booking" | "payment" | "equipment" | "maintenance" | "client"
      id: string
      name: string
      link: string
    }
    
    assignedTo?: {
      id: string
      name: string
      avatar?: string
    }
    
    createdAt: Date
    dueDate?: Date
    completedAt?: Date
    
    actions: {
      primary?: {
        label: string
        action: () => void
        confirmRequired: boolean
      }
      secondary?: {
        label: string
        action: () => void
      }
      dismiss?: {
        enabled: boolean
        requiresReason: boolean
      }
    }
    
    metadata: Record<string, any>
  }
}
```

### **أنواع Actions:**

#### 1. Failed Payments (Urgent)
```typescript
{
  type: "alert"
  priority: "urgent"
  title: "Payment Failed"
  description: "Booking #BK-1234 payment failed - SAR 2,500"
  relatedEntity: {
    type: "booking"
    id: "BK-1234"
    link: "/admin/bookings/BK-1234"
  }
  actions: {
    primary: {
      label: "Retry Payment"
      action: () => retryPayment()
    }
    secondary: {
      label: "Contact Client"
      action: () => openWhatsApp()
    }
  }
  metadata: {
    paymentId: "PAY-5678"
    amount: 2500
    failureReason: "Insufficient funds"
    attempts: 1
  }
}
```

#### 2. Low Stock Alert (High)
```typescript
{
  type: "alert"
  priority: "high"
  title: "Low Stock Alert"
  description: "Sony A7S III: 1 unit left (minimum: 2)"
  relatedEntity: {
    type: "equipment"
    id: "EQ-123"
    link: "/admin/inventory/equipment/EQ-123"
  }
  actions: {
    primary: {
      label: "Order More"
      action: () => createPurchaseOrder()
    }
    dismiss: {
      enabled: true
      requiresReason: true
    }
  }
  metadata: {
    currentStock: 1
    minimumStock: 2
    upcomingBookings: 3
  }
}
```

#### 3. Maintenance Due (High)
```typescript
{
  type: "task"
  priority: "high"
  title: "Maintenance Due"
  description: "7 equipment items require maintenance"
  relatedEntity: {
    type: "maintenance"
    link: "/admin/maintenance?status=due"
  }
  actions: {
    primary: {
      label: "Schedule Maintenance"
      action: () => openScheduler()
    }
  }
  metadata: {
    equipmentIds: ["EQ-123", "EQ-456", ...]
    overdueCount: 2
  }
}
```

#### 4. Late Returns (Urgent)
```typescript
{
  type: "alert"
  priority: "urgent"
  title: "Late Return"
  description: "Booking #BK-1233 - Equipment not returned (2 days overdue)"
  relatedEntity: {
    type: "booking"
    id: "BK-1233"
    link: "/admin/bookings/BK-1233"
  }
  actions: {
    primary: {
      label: "Contact Client"
      action: () => openWhatsApp()
    }
    secondary: {
      label: "Apply Late Fee"
      action: () => applyLateFee()
    }
  }
  metadata: {
    returnDate: "2024-01-26"
    daysOverdue: 2
    equipment: ["Camera", "Lens"]
    clientPhone: "+966..."
  }
}
```

#### 5. Overbooking Risk (High)
```typescript
{
  type: "alert"
  priority: "high"
  title: "Potential Overbooking"
  description: "Sony A7S III: 3 overlapping bookings detected"
  relatedEntity: {
    type: "equipment"
    id: "EQ-123"
    link: "/admin/inventory/equipment/EQ-123"
  }
  actions: {
    primary: {
      label: "Resolve Conflicts"
      action: () => openConflictResolver()
    }
  }
  metadata: {
    conflictingBookings: ["BK-1234", "BK-1235", "BK-1236"]
    date: "2024-02-01"
  }
}
```

#### 6. Discount Approval Required (Normal)
```typescript
{
  type: "approval"
  priority: "normal"
  title: "Discount Approval Required"
  description: "Quote #QT-5678 - 25% discount requested (over 20% limit)"
  relatedEntity: {
    type: "quote"
    id: "QT-5678"
    link: "/admin/quotes/QT-5678"
  }
  assignedTo: {
    id: "user-123"
    name: "Manager"
  }
  actions: {
    primary: {
      label: "Approve"
      action: () => approveDiscount()
      confirmRequired: true
    }
    secondary: {
      label: "Reject"
      action: () => rejectDiscount()
    }
  }
  metadata: {
    requestedBy: "Ahmed Ali"
    discount: 25
    limit: 20
    amount: 5000
    reason: "Large order - repeat client"
  }
}
```

### **UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Action Center                                       │
├─────────────────────────────────────────────────────┤
│ [Urgent: 5] [High: 12] [Normal: 8] [Overdue: 2]   │
├─────────────────────────────────────────────────────┤
│ Filters: [Priority▼] [Type▼] [Status▼] [Search]   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔴 URGENT - Payment Failed                      │ │
│ │ Booking #BK-1234 payment failed - SAR 2,500     │ │
│ │ [Retry Payment] [Contact Client]                │ │
│ │ 5 minutes ago                                   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔴 URGENT - Late Return                         │ │
│ │ #BK-1233 - 2 days overdue                       │ │
│ │ [Contact Client] [Apply Late Fee]               │ │
│ │ 2 hours ago                                     │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🟠 HIGH - Low Stock Alert                       │ │
│ │ Sony A7S III: 1 unit left                       │ │
│ │ [Order More] [Dismiss]                          │ │
│ │ 1 day ago                                       │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### **Additional Features:**
- Real-time updates (WebSocket/Polling)
- Desktop notifications
- Email/WhatsApp digests
- Snooze action
- Bulk actions
- Assignment/delegation
- SLA tracking
- Auto-escalation rules

---

## 2.2 `/admin/approvals` (جديد - حرج)

### **الهدف:**
نظام مركزي لجميع الموافقات

```typescript
ApprovalsSystem {
  filters: {
    type: "all" | "discount" | "refund" | "change_request" | "overbooking" | "manual_booking"
    status: "pending" | "approved" | "rejected"
    priority: "urgent" | "high" | "normal"
    assignedTo: "me" | "team" | "all"
    dateRange: DateRange
  }
  
  summary: {
    pending: number
    approved: number
    rejected: number
    avgApprovalTime: number // in hours
    byType: { type: string, count: number }[]
  }
  
  approvals: Approval[]
  
  Approval: {
    id: string
    type: ApprovalType
    status: "pending" | "approved" | "rejected"
    priority: "urgent" | "high" | "normal"
    
    requestor: {
      id: string
      name: string
      role: string
    }
    
    approver?: {
      id: string
      name: string
    }
    
    subject: string
    description: string
    
    relatedEntity: {
      type: string
      id: string
      name: string
      link: string
    }
    
    requestDetails: Record<string, any>
    
    financialImpact?: {
      amount: number
      type: "cost" | "revenue_loss" | "discount"
    }
    
    businessJustification?: string
    
    actions: {
      approve: {
        requiresComment: boolean
        requiresMFA: boolean
        action: (comment?: string) => Promise<void>
      }
      reject: {
        requiresReason: boolean
        action: (reason: string) => Promise<void>
      }
      requestMoreInfo: {
        enabled: boolean
        action: (message: string) => Promise<void>
      }
    }
    
    history: {
      timestamp: Date
      action: string
      user: string
      comment?: string
    }[]
    
    createdAt: Date
    dueDate?: Date
    decidedAt?: Date
    sla: {
      target: number // hours
      remaining: number
      breached: boolean
    }
  }
}
```

### **أنواع Approvals:**

#### 1. Discount Approval
```typescript
{
  type: "discount"
  priority: "normal"
  subject: "25% Discount Request"
  description: "Quote #QT-5678 - Client requesting 25% discount"
  
  requestDetails: {
    originalAmount: 5000
    discountPercentage: 25
    discountedAmount: 3750
    threshold: 20 // auto-approve under 20%
    reason: "Repeat client with 10+ previous bookings"
    clientHistory: {
      totalBookings: 15
      totalRevenue: 45000
      averageOrderValue: 3000
    }
  }
  
  businessJustification: "Client has excellent history and this is a large order"
  
  financialImpact: {
    amount: 1250
    type: "revenue_loss"
  }
}
```

#### 2. Refund Approval
```typescript
{
  type: "refund"
  priority: "high"
  subject: "Full Refund Request"
  description: "Booking #BK-1234 - Client requesting full refund"
  
  requestDetails: {
    bookingId: "BK-1234"
    originalAmount: 2500
    refundAmount: 2500
    refundType: "full"
    reason: "Equipment malfunction"
    policy: {
      allows: false // outside policy window
      window: "48 hours before start"
      timeToStart: "12 hours"
    }
    clientRequest: "Camera had issues, couldn't complete shoot"
  }
  
  businessJustification: "Equipment issue confirmed, maintain client satisfaction"
  
  financialImpact: {
    amount: 2500
    type: "revenue_loss"
  }
}
```

#### 3. Change Request Approval
```typescript
{
  type: "change_request"
  priority: "normal"
  subject: "Booking Date Change"
  description: "Booking #BK-1235 - Client requesting date change"
  
  requestDetails: {
    bookingId: "BK-1235"
    originalDates: {
      start: "2024-02-01"
      end: "2024-02-03"
    }
    requestedDates: {
      start: "2024-02-10"
      end: "2024-02-12"
    }
    availability: {
      available: true
      conflicts: []
    }
    priceDifference: 0
    policy: {
      allows: true
      fee: 0 // no fee for this change
    }
  }
  
  businessJustification: "No conflicts, maintain client satisfaction"
}
```

#### 4. Overbooking Approval
```typescript
{
  type: "overbooking"
  priority: "urgent"
  subject: "Overbooking Request"
  description: "Staff requesting to overbook Sony A7S III"
  
  requestDetails: {
    equipmentId: "EQ-123"
    equipmentName: "Sony A7S III"
    currentBookings: 3
    availableUnits: 2
    requestedBooking: "BK-1236"
    conflictDate: "2024-02-05"
    mitigation: {
      plan: "Can source from partner"
      cost: 500
      confidence: "high"
    }
    clientImportance: "VIP - repeat client"
  }
  
  businessJustification: "VIP client, can source alternative, high-margin booking"
  
  financialImpact: {
    amount: 500 // extra cost
    type: "cost"
  }
}
```

#### 5. Manual Booking Approval
```typescript
{
  type: "manual_booking"
  priority: "high"
  subject: "Out-of-Policy Booking"
  description: "Booking with special terms requires approval"
  
  requestDetails: {
    deviations: [
      "Below minimum rental duration",
      "Custom pricing (30% below standard)",
      "Deferred payment terms"
    ]
    clientType: "Corporate - Large Account"
    contractValue: 50000 // annual
    proposedTerms: {
      duration: "1 day" // minimum is 2
      price: 1750 // standard is 2500
      payment: "Net 30" // standard is immediate
    }
  }
  
  businessJustification: "Strategic client, potential for large contract"
}
```

### **UI Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Approvals                                            │
├──────────────────────────────────────────────────────┤
│ [Pending: 8] [Approved: 45] [Rejected: 3]           │
│ Avg Approval Time: 2.3 hours                         │
├──────────────────────────────────────────────────────┤
│ Filters: [Type▼] [Priority▼] [Assigned▼] [Search]   │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐   │
│ │ 🔴 URGENT - Overbooking Request                │   │
│ │ Sony A7S III - Requested by Ahmed Ali          │   │
│ │                                                │   │
│ │ Details:                                       │   │
│ │ • 3 bookings, 2 units available                │   │
│ │ • Can source from partner (cost: SAR 500)      │   │
│ │ • VIP client                                   │   │
│ │                                                │   │
│ │ Justification:                                 │   │
│ │ "VIP client, can source alternative..."        │   │
│ │                                                │   │
│ │ Financial Impact: -SAR 500 (cost)             │   │
│ │                                                │   │
│ │ SLA: ⏱️ 2 hours remaining                      │   │
│ │                                                │   │
│ │ [✅ Approve] [❌ Reject] [💬 Request Info]     │   │
│ │                                                │   │
│ │ History:                                       │   │
│ │ • Requested by Ahmed Ali (2h ago)             │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### **Additional Features:**
- Approval workflows (multi-level)
- Delegation rules
- Auto-approval thresholds
- Approval templates
- Bulk approve/reject
- SLA monitoring
- Escalation rules
- Approval analytics
- Audit trail
- Export approvals log

---

## 2.3 `/admin/live-ops` (جديد - مهم)

### **الهدف:**
Dashboard للعمليات الحية في الوقت الفعلي

```typescript
LiveOperations {
  realTimeData: {
    enabled: true
    updateInterval: 30000 // 30 seconds
    lastUpdate: Date
  }
  
  overview: {
    activeBookings: {
      count: number
      equipmentRentals: number
      studioSessions: number
      totalValue: number
    }
    
    todayDeliveries: {
      completed: number
      pending: number
      inProgress: number
      delayed: number
    }
    
    checkOutQueue: {
      pending: number
      avgWaitTime: number // minutes
    }
    
    checkInQueue: {
      pending: number
      overdueReturns: number
    }
    
    staffStatus: {
      active: number
      busy: number
      available: number
    }
  }
  
  timeline: {
    type: "gantt" | "list"
    view: "today" | "week" | "month"
    
    events: LiveEvent[]
    
    LiveEvent: {
      id: string
      type: "booking_start" | "booking_end" | "delivery" | "pickup" | "maintenance"
      time: Date
      duration?: number
      status: "upcoming" | "active" | "completed" | "delayed"
      
      booking?: {
        id: string
        client: string
        items: string[]
      }
      
      delivery?: {
        id: string
        driver: string
        location: string
        eta?: Date
      }
      
      color: string
      priority: "normal" | "high" | "urgent"
    }
  }
  
  map: {
    enabled: boolean // if GPS tracking available
    markers: {
      warehouses: Location[]
      deliveries: {
        id: string
        location: Coordinates
        status: "in_transit" | "arrived"
        driver: string
        eta: Date
      }[]
      studios: Location[]
    }
  }
  
  alerts: {
    items: Alert[]
    Alert: {
      type: "warning" | "error" | "info"
      message: string
      timestamp: Date
      action?: { label: string, onClick: () => void }
    }
  }
  
  quickActions: {
    updateDeliveryStatus: (id: string, status: string) => void
    markCheckOut: (bookingId: string) => void
    markCheckIn: (bookingId: string) => void
    callDriver: (driverId: string) => void
    sendAlert: (recipientId: string, message: string) => void
  }
}
```

### **UI Sections:**

#### 1. Overview Cards
```
[Active Bookings: 15]  [Deliveries Today: 8]  [Check-Out Queue: 3]  [Staff Active: 5]
```

#### 2. Timeline View
```
08:00 ━━ 10:00 Studio A - Client A (Active)
      ├─ 09:00 📦 Delivery to Client B (In Transit)
10:00 ━━ 12:00 Studio B - Client C (Upcoming)
      ├─ 10:30 🔧 Maintenance - Camera #123
12:00 ━━ 14:00 Equipment Return - Client D
```

#### 3. Deliveries Map (if GPS enabled)
```
[Map with markers for:]
- 🏢 Warehouse location
- 🚚 Active deliveries (moving markers)
- 📍 Delivery destinations
- 🎥 Studio locations
```

#### 4. Check-Out Queue
```
┌────────────────────────────────────┐
│ Pending Check-Outs (3)             │
├────────────────────────────────────┤
│ #BK-1234 - Client A (Waiting 15m)  │
│ • Sony A7S III                     │
│ • 24-70mm Lens                     │
│ [✅ Mark Checked-Out]              │
├────────────────────────────────────┤
│ #BK-1235 - Client B (Waiting 5m)   │
│ • Studio A (10:00-12:00)           │
│ [✅ Mark Ready]                    │
└────────────────────────────────────┘
```

#### 5. Active Alerts
```
⚠️ Delivery delayed: #DEL-123 - ETA pushed by 30 minutes
🔴 Late return: #BK-1233 - Equipment overdue by 2 days
ℹ️ Maintenance completed: Camera #123 back in stock
```

### **Additional Features:**
- Real-time notifications
- Live chat with staff/drivers
- Weather alerts (for deliveries)
- Traffic updates integration
- Equipment location tracking (if available)
- Client arrival notifications
- Auto-refresh toggle
- Full-screen mode
- Custom views (save filters)

---

