# 📋 خطة شاملة ومفصلة لإكمال لوحة التحكم - من 33% إلى 100%

**الهدف:** تحويل لوحة التحكم من حالتها الحالية (33% مكتملة) إلى نظام production-ready كامل ومتكامل

---

## 📊 الوضع الحالي vs المطلوب

| المؤشر | الحالي | المطلوب | الفجوة |
|--------|--------|---------|--------|
| صفحات Live | 25 | 75+ | 50 صفحة |
| صفحات Mock | 15 | 0 | -15 صفحة |
| صفحات Missing | 35 | 0+ | 35 صفحة |
| APIs مكتملة | ~40% | 100% | +60% |
| Features كاملة | 33% | 100% | +67% |

---

# 🗂️ القسم الأول: Dashboard & Analytics

## 1.1 `/admin/dashboard` (تحسينات حرجة)

### **الوضع الحالي:**
- ✅ KPIs أساسية موجودة
- ⚠️ المقارنات hardcoded (+12%, -5%)
- ❌ لا يوجد date range selector
- ❌ لا يوجد drill-down
- ❌ لا يوجد alerts

### **ما يجب إضافته:**

#### 1. Date Range Selector (أولوية عالية)

```typescript
DateRangeSelector {
  presets: [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "This Month",
    "Last Month",
    "This Quarter",
    "This Year",
    "Custom Range"
  ]
  comparison: {
    enabled: true
    options: ["Previous Period", "Previous Year", "Custom"]
  }
}
```

**UI Elements:**
- DatePicker component مع Presets
- زر "Compare to" مع Dropdown
- Badge يظهر الفترة المختارة
- زر "Reset to default"

#### 2. KPI Cards - تحسينات

**Revenue Card:**
```typescript
RevenueKPI {
  current: number // من DB فعلي
  previous: number // نفس الفترة السابقة
  change: {
    value: number // حساب فعلي
    percentage: number // حساب فعلي
    trend: "up" | "down" | "stable"
  }
  breakdown: {
    equipment: number
    studio: number
    packages: number
    addons: number
  }
  targets: {
    monthly: number
    achieved: number
    percentage: number
  }
}
```

**UI Elements:**
- رقم أكبر للقيمة الحالية
- Arrow icon (up/down) مع اللون المناسب
- Tooltip عند hover يظهر breakdown
- Progress bar للـ target
- زر "View Details" يفتح modal أو ينقل لصفحة Revenue

**Bookings Card:**
```typescript
BookingsKPI {
  total: number
  byStatus: {
    confirmed: number
    active: number
    completed: number
    cancelled: number
  }
  byType: {
    equipment: number
    studio: number
    mixed: number
  }
  averageValue: number
  conversionRate: number // quotes to bookings
}
```

**Occupancy Card:**
```typescript
OccupancyKPI {
  equipment: {
    totalUnits: number
    rentedUnits: number
    percentage: number
    topRented: Equipment[] // top 5
  }
  studio: {
    totalHours: number
    bookedHours: number
    percentage: number
  }
  trend: "increasing" | "decreasing" | "stable"
}
```

**New Clients Card:**
```typescript
NewClientsKPI {
  thisMonth: number
  lastMonth: number
  change: number
  sources: {
    website: number
    referral: number
    repeat: number
    social: number
  }
  retentionRate: number
}
```

#### 3. Charts - تحسينات

**Revenue Chart:**
```typescript
RevenueChart {
  type: "line" | "bar" | "area"
  granularity: "day" | "week" | "month"
  datasets: [
    {
      label: "Equipment Revenue"
      data: number[]
      color: "#10b981"
    },
    {
      label: "Studio Revenue"
      data: number[]
      color: "#3b82f6"
    },
    {
      label: "Packages Revenue"
      data: number[]
      color: "#8b5cf6"
    }
  ]
  comparison?: {
    label: "Previous Period"
    data: number[]
    style: "dashed"
  }
}
```

**UI Elements:**
- Tabs للتبديل بين Line/Bar/Area
- Dropdown لاختيار Granularity
- Legend مع checkboxes للإظهار/الإخفاء
- Zoom controls
- Export button (PNG/CSV)
- Tooltip يظهر التفاصيل

**Booking Status Chart:**
```typescript
BookingStatusChart {
  type: "donut" | "pie" | "bar"
  data: [
    { status: "Confirmed", count: number, percentage: number },
    { status: "Active", count: number, percentage: number },
    { status: "Completed", count: number, percentage: number },
    { status: "Cancelled", count: number, percentage: number },
    { status: "Payment Failed", count: number, percentage: number }
  ]
  colors: {
    confirmed: "#10b981"
    active: "#3b82f6"
    completed: "#6b7280"
    cancelled: "#ef4444"
    paymentFailed: "#f59e0b"
  }
  clickable: true // navigate to filtered bookings
}
```

#### 4. Recent Bookings Table - تحسينات

```typescript
RecentBookingsTable {
  columns: [
    "ID",
    "Client",
    "Type",
    "Dates",
    "Status",
    "Amount",
    "Payment Status",
    "Actions"
  ]
  limit: 10
  sorting: true
  filters: {
    status: string[]
    type: string[]
    dateRange: DateRange
  }
  actions: [
    "View Details",
    "Send Message",
    "Print Invoice"
  ]
  footer: {
    showTotal: true
    viewAllLink: "/admin/bookings"
  }
}
```

#### 5. Alerts Section (جديد - حرج)

```typescript
AlertsWidget {
  alerts: [
    {
      type: "error" | "warning" | "info"
      title: string
      message: string
      action?: {
        label: string
        link: string
      }
      count?: number
      priority: "urgent" | "high" | "normal"
    }
  ]
  examples: [
    {
      type: "error"
      title: "Failed Payments"
      message: "5 payments failed in the last 24h"
      action: { label: "Review", link: "/admin/payments?status=failed" }
      count: 5
      priority: "urgent"
    },
    {
      type: "warning"
      title: "Low Stock"
      message: "3 equipment items below minimum quantity"
      action: { label: "Check Inventory", link: "/admin/inventory/equipment?stock=low" }
      count: 3
      priority: "high"
    },
    {
      type: "warning"
      title: "Upcoming Maintenance"
      message: "7 equipment items due for maintenance"
      action: { label: "View Schedule", link: "/admin/maintenance?status=due" }
      count: 7
      priority: "normal"
    },
    {
      type: "warning"
      title: "Late Returns"
      message: "2 bookings have overdue returns"
      action: { label: "Contact Clients", link: "/admin/bookings?status=overdue" }
      count: 2
      priority: "urgent"
    }
  ]
}
```

#### 6. Quick Actions - تحسينات

```typescript
QuickActions {
  actions: [
    {
      icon: "Plus"
      label: "New Booking"
      link: "/admin/bookings/new"
      color: "primary"
      shortcut: "Ctrl+B"
    },
    {
      icon: "FileText"
      label: "New Quote"
      link: "/admin/quotes/new"
      color: "secondary"
    },
    {
      icon: "Package"
      label: "Add Equipment"
      link: "/admin/inventory/equipment/new"
      color: "secondary"
    },
    {
      icon: "Users"
      label: "New Client"
      link: "/admin/clients/new"
      color: "secondary"
    },
    {
      icon: "Calendar"
      label: "View Calendar"
      link: "/admin/calendar"
      color: "secondary"
    }
  ]
  layout: "grid" | "list"
  customizable: true // يمكن للمستخدم إضافة/إزالة
}
```

#### 7. Revenue Forecast Widget (جديد - AI-powered)

```typescript
RevenueForecast {
  period: "next_7_days" | "next_30_days" | "next_quarter"
  forecast: {
    expected: number
    optimistic: number
    pessimistic: number
    confidence: number // 0-100
  }
  factors: [
    "Historical data",
    "Confirmed bookings",
    "Seasonal trends",
    "Current occupancy"
  ]
  chart: {
    type: "line"
    actual: number[] // past data
    forecast: number[] // future projection
    confidenceInterval: [number, number][]
  }
}
```

---

## 1.2 `/admin/dashboard/overview` (تحويل من Placeholder)

### **المطلوب:**
صفحة Overview شاملة مع widgets قابلة للتخصيص

```typescript
DashboardOverview {
  layout: "grid" | "masonry"
  customizable: true
  widgets: [
    {
      id: "revenue-summary"
      type: "kpi-card"
      size: "medium"
      position: { x: 0, y: 0 }
      data: RevenueSummaryWidget
    },
    {
      id: "booking-funnel"
      type: "chart"
      size: "large"
      position: { x: 1, y: 0 }
      data: BookingFunnelChart
    },
    {
      id: "top-equipment"
      type: "list"
      size: "medium"
      position: { x: 0, y: 1 }
      data: TopEquipmentList
    },
    {
      id: "upcoming-events"
      type: "timeline"
      size: "medium"
      position: { x: 1, y: 1 }
      data: UpcomingEventsTimeline
    }
  ]
  availableWidgets: [
    "revenue-summary",
    "booking-funnel",
    "top-equipment",
    "top-clients",
    "inventory-status",
    "payment-status",
    "staff-performance",
    "upcoming-events",
    "maintenance-schedule",
    "alert-center"
  ]
}
```

**UI Elements:**
- زر "Customize Dashboard"
- Drag & Drop لإعادة ترتيب الـ Widgets
- زر "+" لإضافة widget جديد
- أيقونة "Settings" لكل widget للإعدادات
- أيقونة "Remove" لإزالة widget
- زر "Reset to Default"
- زر "Save Layout"

---

## 1.3 `/admin/dashboard/revenue` (تحويل من Placeholder)

### **المطلوب:**
صفحة تحليلات إيرادات متقدمة

```typescript
RevenueDashboard {
  filters: {
    dateRange: DateRange
    comparison: ComparisonPeriod
    groupBy: "day" | "week" | "month" | "quarter"
    revenueType: "all" | "equipment" | "studio" | "packages"
  }
  
  metrics: {
    totalRevenue: {
      current: number
      previous: number
      change: number
      trend: ChartData[]
    }
    averageOrderValue: {
      current: number
      previous: number
      change: number
    }
    revenuePerClient: {
      current: number
      previous: number
      change: number
    }
    conversionRate: {
      quotes: number
      bookings: number
      rate: number
    }
  }
  
  charts: {
    revenueOverTime: {
      type: "line" | "bar" | "area"
      data: ChartData[]
      breakdowns: ["equipment", "studio", "packages", "addons"]
    }
    revenueByCategory: {
      type: "pie" | "donut" | "treemap"
      data: CategoryData[]
    }
    revenueByClient: {
      type: "bar"
      data: ClientRevenueData[]
      limit: 20
    }
    revenueBySource: {
      type: "funnel"
      data: SourceData[]
    }
  }
  
  tables: {
    topEquipment: {
      columns: ["Equipment", "Rentals", "Revenue", "Growth"]
      data: EquipmentRevenueData[]
      sortable: true
      exportable: true
    }
    topClients: {
      columns: ["Client", "Bookings", "Revenue", "LTV"]
      data: ClientData[]
    }
    revenueByMonth: {
      columns: ["Month", "Revenue", "Growth", "Target", "Achievement"]
      data: MonthlyRevenueData[]
    }
  }
  
  insights: {
    aiPowered: true
    items: [
      {
        type: "positive" | "negative" | "neutral"
        title: string
        description: string
        action?: { label: string, link: string }
      }
    ]
    examples: [
      {
        type: "positive"
        title: "Equipment revenue up 23%"
        description: "Camera rentals increased significantly in the last 30 days"
        action: { label: "View Details", link: "/admin/inventory/equipment?sort=revenue" }
      }
    ]
  }
  
  export: {
    formats: ["PDF", "Excel", "CSV"]
    templates: ["Summary", "Detailed", "Executive"]
    scheduling: {
      enabled: true
      frequencies: ["daily", "weekly", "monthly"]
      recipients: string[]
    }
  }
}
```

**UI Elements:**
- Filter bar في الأعلى
- Grid من KPI cards
- Section للـ Charts (2-3 charts)
- Section للـ Tables
- Insights panel في الجانب أو أسفل
- Export button مع Options
- Schedule Report button
- Print button

---

## 1.4 `/admin/dashboard/activity` (تحويل من Placeholder)

### **المطلوب:**
Activity Feed للنظام

```typescript
ActivityDashboard {
  filters: {
    dateRange: DateRange
    activityType: "all" | "bookings" | "payments" | "inventory" | "users" | "system"
    user: string // filter by user
    entity: string // filter by booking/equipment/etc
  }
  
  feed: {
    items: ActivityItem[]
    grouping: "none" | "by-hour" | "by-day"
    realtime: boolean // live updates
    
    ActivityItem: {
      id: string
      timestamp: Date
      type: ActivityType
      actor: {
        id: string
        name: string
        role: string
        avatar?: string
      }
      action: string
      entity: {
        type: string
        id: string
        name: string
      }
      details: Record<string, any>
      important: boolean
      icon: string
      color: string
    }
  }
  
  stats: {
    totalActivities: number
    byType: { type: string, count: number }[]
    byUser: { user: string, count: number }[]
    busyHours: { hour: number, count: number }[]
  }
  
  realTimeIndicator: {
    enabled: true
    lastUpdate: Date
    activeUsers: number
  }
}
```

**أمثلة على Activities:**
```typescript
[
  {
    type: "booking_created"
    actor: { name: "Ahmed Ali", role: "Admin" }
    action: "created booking"
    entity: { type: "booking", id: "BK-1234", name: "#BK-1234" }
    timestamp: "2 minutes ago"
    icon: "Calendar"
    color: "green"
  },
  {
    type: "payment_received"
    actor: { name: "System", role: "System" }
    action: "received payment"
    entity: { type: "payment", id: "PAY-5678", name: "SAR 2,500" }
    timestamp: "5 minutes ago"
    icon: "CreditCard"
    color: "blue"
  },
  {
    type: "equipment_added"
    actor: { name: "Sara Ahmed", role: "Staff" }
    action: "added equipment"
    entity: { type: "equipment", id: "EQ-123", name: "Sony A7S III" }
    timestamp: "10 minutes ago"
    icon: "Package"
    color: "purple"
  },
  {
    type: "booking_cancelled"
    actor: { name: "Mohammed Ali", role: "Admin" }
    action: "cancelled booking"
    entity: { type: "booking", id: "BK-1233", name: "#BK-1233" }
    timestamp: "15 minutes ago"
    icon: "XCircle"
    color: "red"
    important: true
  }
]
```

**UI Elements:**
- Live indicator badge (🟢 Live)
- Filter dropdown
- Timeline-style feed
- Avatar للـ actor
- Entity link (clickable)
- Load more / infinite scroll
- Search box
- Export button

---

## 1.5 `/admin/dashboard/recent-bookings` (تحويل من Placeholder)

### **المطلوب:**
قائمة متقدمة للحجوزات الأخيرة

```typescript
RecentBookingsDashboard {
  filters: {
    timeframe: "today" | "last_7_days" | "last_30_days"
    status: BookingStatus[]
    type: "all" | "equipment" | "studio" | "mixed"
    sortBy: "created" | "start_date" | "amount"
    sortOrder: "asc" | "desc"
  }
  
  summary: {
    total: number
    totalValue: number
    byStatus: { status: string, count: number, value: number }[]
    byType: { type: string, count: number, value: number }[]
  }
  
  table: {
    columns: [
      {
        key: "id"
        label: "Booking ID"
        sortable: true
        render: (value) => <Link>{value}</Link>
      },
      {
        key: "client"
        label: "Client"
        sortable: true
        render: (value) => <ClientCard client={value} />
      },
      {
        key: "type"
        label: "Type"
        filterable: true
        render: (value) => <Badge>{value}</Badge>
      },
      {
        key: "dates"
        label: "Dates"
        sortable: true
        render: (value) => <DateRange {...value} />
      },
      {
        key: "items"
        label: "Items"
        render: (value) => <ItemsList items={value} />
      },
      {
        key: "status"
        label: "Status"
        filterable: true
        render: (value) => <StatusBadge status={value} />
      },
      {
        key: "amount"
        label: "Amount"
        sortable: true
        render: (value) => <Currency value={value} />
      },
      {
        key: "payment"
        label: "Payment"
        render: (value) => <PaymentStatus {...value} />
      },
      {
        key: "actions"
        label: "Actions"
        render: (booking) => <ActionsMenu booking={booking} />
      }
    ]
    data: Booking[]
    pagination: {
      page: number
      pageSize: number
      total: number
    }
    bulkActions: [
      "Send Reminder",
      "Export Selected",
      "Print Invoices",
      "Send Messages"
    ]
  }
  
  quickStats: {
    todayBookings: number
    activeNow: number
    pendingPayment: number
    requiresAttention: number
  }
}
```

**UI Elements:**
- Summary cards في الأعلى
- Filter bar
- Table مع checkboxes للـ bulk actions
- Pagination
- Items per page selector
- Column visibility toggle
- Export button
- Refresh button

---

## 1.6 `/admin/dashboard/quick-actions` (تحويل من Placeholder)

### **المطلوب:**
Command Center للإجراءات السريعة

```typescript
QuickActionsDashboard {
  sections: [
    {
      title: "Bookings"
      actions: [
        {
          icon: "Plus"
          label: "New Booking"
          description: "Create a new booking"
          link: "/admin/bookings/new"
          shortcut: "Ctrl+B"
          primary: true
        },
        {
          icon: "FileText"
          label: "New Quote"
          description: "Generate a quote"
          link: "/admin/quotes/new"
          shortcut: "Ctrl+Q"
        },
        {
          icon: "Search"
          label: "Find Booking"
          description: "Search by ID or client"
          action: "openSearchModal"
          shortcut: "Ctrl+F"
        }
      ]
    },
    {
      title: "Inventory"
      actions: [
        {
          icon: "Package"
          label: "Add Equipment"
          link: "/admin/inventory/equipment/new"
        },
        {
          icon: "Upload"
          label: "Import Excel"
          link: "/admin/inventory/import"
        },
        {
          icon: "BarChart"
          label: "Check Availability"
          link: "/admin/availability"
        }
      ]
    },
    {
      title: "Clients"
      actions: [
        {
          icon: "UserPlus"
          label: "New Client"
          link: "/admin/clients/new"
        },
        {
          icon: "Search"
          label: "Find Client"
          action: "openClientSearch"
        }
      ]
    },
    {
      title: "Operations"
      actions: [
        {
          icon: "Package"
          label: "Check-Out Queue"
          link: "/admin/ops/warehouse?view=checkout"
          badge: 5 // pending count
        },
        {
          icon: "TruckIcon"
          label: "Delivery Schedule"
          link: "/admin/ops/delivery"
          badge: 3
        },
        {
          icon: "Wrench"
          label: "Maintenance Due"
          link: "/admin/maintenance?status=due"
          badge: 7
        }
      ]
    },
    {
      title: "Finance"
      actions: [
        {
          icon: "FileText"
          label: "Generate Invoice"
          link: "/admin/invoices/new"
        },
        {
          icon: "DollarSign"
          label: "Record Payment"
          action: "openPaymentModal"
        },
        {
          icon: "AlertCircle"
          label: "Failed Payments"
          link: "/admin/payments?status=failed"
          badge: 2
          urgent: true
        }
      ]
    },
    {
      title: "Reports"
      actions: [
        {
          icon: "BarChart"
          label: "Revenue Report"
          link: "/admin/finance/reports?type=revenue"
        },
        {
          icon: "TrendingUp"
          label: "Performance Dashboard"
          link: "/admin/dashboard/overview"
        }
      ]
    }
  ]
  
  recentActions: {
    enabled: true
    items: Action[] // last 10 actions by user
  }
  
  favoriteActions: {
    enabled: true
    customizable: true
    items: Action[] // user favorites
  }
  
  commandPalette: {
    enabled: true
    shortcut: "Ctrl+K"
    searchable: true
    categories: ["bookings", "inventory", "clients", "finance", "operations"]
  }
}
```

**UI Elements:**
- Grid layout للـ sections
- Cards للـ actions مع icons كبيرة
- Badge indicators للـ counts
- Urgent actions في الأعلى
- Recent actions sidebar
- Favorites section قابلة للتخصيص
- Command Palette (Ctrl+K)
- Keyboard shortcuts overlay (?)

---

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

# 📋 خطة شاملة ومفصلة لإكمال لوحة التحكم - الجزء الثالث

# 🗂️ القسم الثالث: Booking Engine Enhancements

## 3.1 `/admin/quotes` (تحسينات ضرورية)

### **الوضع الحالي:**
- ✅ List موجود
- ✅ Detail موجود
- ❌ Create مفقود
- ❌ PDF/Email غير موجود
- ❌ Version Control مفقود

### **ما يجب إضافته:**

#### `/admin/quotes/new` (جديد - حرج)

```typescript
QuoteCreation {
  wizard: {
    steps: [
      "client_selection",
      "items_selection",
      "pricing",
      "terms",
      "review"
    ]
    progress: number
    canSkip: boolean
    saveAsDraft: boolean
  }
  
  clientSelection: {
    existing: {
      search: {
        query: string
        filters: {
          type: "individual" | "corporate"
          tag: string[]
        }
        results: Client[]
      }
      quickSelect: Client[] // recent clients
    }
    
    new: {
      quickCreate: {
        name: string
        email: string
        phone: string
        type: "individual" | "corporate"
      }
      fullForm: boolean
    }
    
    guest: {
      allow: boolean
      fields: ["name", "email", "phone"]
    }
  }
  
  itemsSelection: {
    equipment: {
      search: {
        query: string
        filters: {
          category: string[]
          brand: string[]
          availability: boolean
        }
        results: Equipment[]
      }
      
      selected: {
        equipmentId: string
        quantity: number
        duration: {
          start: Date
          end: Date
          days: number
        }
        price: {
          daily: number
          total: number
        }
        alternatives: Equipment[] // if not available
      }[]
      
      recommendations: {
        enabled: boolean
        items: Equipment[]
        source: "ai" | "rules" | "manual"
      }
    }
    
    studio: {
      studioId: string
      date: Date
      timeSlot: {
        start: string
        end: string
        hours: number
      }
      package?: {
        packageId: string
        included: string[]
      }
      addons: {
        addonId: string
        quantity: number
      }[]
    }
    
    packages: {
      available: Package[]
      selected?: Package
      customize: boolean // allow removing items
    }
  }
  
  pricing: {
    subtotal: number
    
    discounts: {
      automatic: {
        bundle: number
        duration: number
        package: number
      }
      manual: {
        type: "percentage" | "fixed"
        value: number
        reason: string
        requiresApproval: boolean
      }
    }
    
    addons: {
      delivery: {
        included: boolean
        fee: number
      }
      insurance: {
        offered: boolean
        rate: number
        total: number
      }
      setup: {
        fee: number
      }
    }
    
    taxes: {
      vat: {
        rate: number
        amount: number
      }
    }
    
    total: number
    deposit: number
  }
  
  terms: {
    duration: {
      start: Date
      end: Date
      flexible: boolean
      buffer: number // days
    }
    
    delivery: {
      method: "pickup" | "delivery"
      address?: string
      date?: Date
      time?: string
    }
    
    payment: {
      deposit: {
        required: boolean
        amount: number
        percentage: number
      }
      remaining: {
        dueDate: Date
        method: "before_delivery" | "on_delivery" | "after_return"
      }
    }
    
    cancellation: {
      policy: "standard" | "flexible" | "strict"
      cutoff: number // hours before
      refund: {
        full: number // hours before for 100%
        partial: {
          hours: number
          percentage: number
        }[]
      }
    }
    
    additional: {
      notes: string
      specialRequests: string
      internalNotes: string
    }
  }
  
  review: {
    summary: {
      client: ClientInfo
      items: ItemSummary[]
      pricing: PricingSummary
      terms: TermsSummary
    }
    
    actions: {
      saveDraft: boolean
      sendToClient: boolean
      sendMethod: "email" | "whatsapp" | "both"
      createBooking: boolean // skip quote, create booking directly
    }
    
    preview: {
      pdf: boolean
      template: "standard" | "premium"
      language: "en" | "ar"
    }
  }
}
```

#### تحسينات `/admin/quotes/[id]`

```typescript
QuoteDetailEnhancements {
  // Add to existing detail page
  
  actions: {
    edit: {
      label: "Edit Quote"
      link: `/admin/quotes/${id}/edit`
    }
    
    duplicate: {
      label: "Duplicate"
      action: () => duplicateQuote()
    }
    
    convertToBooking: {
      label: "Convert to Booking"
      requirements: {
        approval: boolean
        payment: boolean
      }
      action: () => convertToBooking()
    }
    
    sendToClient: {
      label: "Send/Resend"
      methods: ["email", "whatsapp", "sms"]
      templates: QuoteTemplate[]
    }
    
    pdf: {
      generate: () => generatePDF()
      download: boolean
      email: boolean
      customization: {
        template: string
        language: string
        includeTerms: boolean
      }
    }
    
    revise: {
      label: "Create Revision"
      action: () => createRevision()
      preserveHistory: true
    }
  }
  
  versionHistory: {
    versions: {
      version: number
      createdAt: Date
      createdBy: string
      changes: string[]
      reason: string
    }[]
    
    compare: {
      enabled: boolean
      versions: [number, number]
      diff: QuoteDiff
    }
    
    restore: {
      enabled: boolean
      toVersion: number
    }
  }
  
  clientInteractions: {
    views: {
      timestamp: Date
      ipAddress: string
      device: string
    }[]
    
    communications: {
      type: "email" | "whatsapp" | "call"
      timestamp: Date
      subject: string
      content: string
      status: "sent" | "delivered" | "read" | "replied"
    }[]
    
    feedback: {
      clientResponse: string
      concerns: string[]
      modifications: string[]
    }
  }
  
  analytics: {
    timeToConversion: number // hours
    revisionsCount: number
    discountApplied: number
    marginPercentage: number
  }
}
```

---

## 3.2 `/admin/bookings` (تحسينات كبيرة)

### **الوضع الحالي:**
- ✅ List موجود
- ✅ Detail موجود مع State Machine
- ✅ Create موجود
- ❌ Conflict Detection ناقص
- ❌ Change Requests مفقود
- ❌ Extensions مفقود

### **ما يجب إضافته:**

#### Conflict Detection System (حرج جداً)

```typescript
ConflictDetection {
  automatic: {
    checkOn: ["create", "update", "date_change"]
    
    types: {
      equipment: {
        quantityCheck: boolean
        considerBuffer: boolean
        checkMaintenanceSchedule: boolean
      }
      
      studio: {
        timeOverlap: boolean
        considerBuffer: boolean
        considerSetup: boolean
      }
      
      staff: {
        availability: boolean
        maxConcurrent: number
      }
    }
    
    severity: {
      critical: {
        description: "Booking impossible - no units available"
        block: true
        notify: ["manager", "ops"]
      }
      
      high: {
        description: "Potential conflict - overlapping bookings"
        warn: true
        requiresReview: boolean
      }
      
      medium: {
        description: "Buffer time violation"
        warn: true
        canOverride: boolean
      }
    }
  }
  
  resolution: {
    suggestions: {
      alternativeDates: Date[]
      alternativeEquipment: Equipment[]
      alternativeStudio: Studio[]
      
      sourceFromPartner: {
        possible: boolean
        cost: number
        partner: string
      }
    }
    
    actions: {
      adjustBuffer: boolean
      createWaitlist: boolean
      notifyClient: boolean
      createCounterOffer: boolean
    }
  }
  
  monitoring: {
    realTime: boolean
    alerts: {
      channels: ["dashboard", "email", "whatsapp"]
      recipients: string[]
    }
    
    dashboard: {
      upcomingConflicts: Conflict[]
      resolvedConflicts: Conflict[]
      preventedConflicts: number
    }
  }
}
```

#### Late Return Management (جديد - مهم)

```typescript
LateReturnManagement {
  detection: {
    automatic: boolean
    checkFrequency: "hourly" | "every_6_hours" | "daily"
    
    grace: Period {
      hours: number
      noFeeWindow: number
    }
  }
  
  notifications: {
    beforeDue: {
      enabled: boolean
      timing: number[] // hours before: [24, 12, 2]
      channels: ["email", "whatsapp", "sms"]
      message: string
    }
    
    afterDue: {
      enabled: boolean
      timing: number[] // hours after: [1, 6, 24]
      escalation: {
        level1: "reminder"
        level2: "warning"
        level3: "legal_notice"
      }
    }
  }
  
  fees: {
    calculation: {
      type: "fixed_per_day" | "percentage_of_rental" | "tiered"
      
      fixed: {
        amount: number
        perDay: boolean
        perHour: boolean
      }
      
      percentage: {
        rate: number
        basedOn: "daily_rate" | "total_rental"
      }
      
      tiered: {
        tiers: {
          hoursLate: number
          fee: number
        }[]
      }
    }
    
    application: {
      automatic: boolean
      requiresApproval: boolean
      notifyClient: boolean
    }
    
    waiver: {
      allowed: boolean
      requiresApproval: boolean
      reasons: string[]
      documentation: boolean
    }
  }
  
  enforcement: {
    blocked: Actions {
      createNewBooking: boolean
      requireClearance: boolean
    }
    
    legal: {
      escalationThreshold: number // days
      process: string
      documentation: string[]
    }
  }
}
```

---

## 3.3 `/admin/calendar` (تحويل من Mock - حرج جداً)

### **المطلوب:**
تقويم تفاعلي كامل - هذا قلب نظام التأجير!

```typescript
CalendarSystem {
  views: {
    day: {
      hourSlots: HourSlot[]
      resources: Resource[]
      
      HourSlot: {
        hour: number
        events: Event[]
        availability: "available" | "partial" | "full"
      }
      
      layout: "vertical" | "horizontal"
      hourHeight: number
    }
    
    week: {
      days: DayColumn[]
      
      DayColumn: {
        date: Date
        events: Event[]
        utilization: number
      }
      
      showWeekend: boolean
      startHour: number
      endHour: number
    }
    
    month: {
      weeks: Week[]
      
      Week: {
        days: DayCell[]
      }
      
      DayCell: {
        date: Date
        events: Event[]
        count: number
        revenue: number
        hasConflicts: boolean
      }
      
      showEventDetails: "tooltip" | "inline" | "modal"
    }
    
    agenda: {
      groupBy: "date" | "resource" | "client"
      
      items: AgendaItem[]
      
      AgendaItem: {
        date: Date
        events: Event[]
        totalRevenue: number
        conflicts: number
      }
      
      sorting: "chronological" | "revenue" | "priority"
    }
    
    timeline: {
      // Gantt-style view
      resources: Resource[]
      scale: "hour" | "day" | "week"
      
      bars: {
        event: Event
        start: number
        duration: number
        conflicts: boolean
      }[]
    }
  }
  
  eventTypes: {
    booking: {
      display: {
        title: string // "#BK-1234 - Client Name"
        subtitle: string // "Equipment: Camera, Lens"
        color: string
        icon: "Calendar"
      }
      
      tooltip: {
        bookingId: string
        client: string
        items: string[]
        dates: string
        amount: number
        status: string
        paymentStatus: string
      }
      
      actions: [
        "View Details",
        "Edit Booking",
        "Contact Client",
        "Check Availability"
      ]
    }
    
    maintenance: {
      display: {
        title: string // "Maintenance: Equipment Name"
        color: "#6b7280"
        icon: "Wrench"
        pattern: "diagonal-stripes"
      }
      
      tooltip: {
        equipment: string
        type: string
        technician: string
        estimatedDuration: number
      }
    }
    
    blocked: {
      display: {
        title: string // "Blocked: Reason"
        color: "#ef4444"
        icon: "Ban"
      }
      
      tooltip: {
        reason: string
        blockedBy: string
        notes: string
      }
    }
  }
  
  interactions: {
    create: {
      method: "click" | "drag"
      
      click: {
        // Click empty slot
        action: "open_booking_form"
        prefill: {
          date: Date
          resource: Resource
        }
      }
      
      drag: {
        // Drag to create
        selectTimeRange: boolean
        selectMultipleResources: boolean
      }
    }
    
    edit: {
      drag: {
        enabled: boolean
        resizeEnabled: boolean
        changeResource: boolean
      }
      
      click: {
        singleClick: "open_details"
        doubleClick: "edit_event"
      }
    }
    
    contextMenu: {
      enabled: boolean
      actions: [
        "View Details",
        "Edit",
        "Duplicate",
        "Cancel",
        "Check Conflicts",
        "Send Reminder"
      ]
    }
  }
  
  filters: {
    resources: {
      equipment: {
        categories: string[]
        specific: string[]
        availability: "all" | "available" | "booked"
      }
      
      studios: {
        specific: string[]
        availability: "all" | "available" | "booked"
      }
    }
    
    bookings: {
      status: BookingStatus[]
      clients: string[]
      dateRange: DateRange
      valueRange: [number, number]
    }
    
    display: {
      showMaintenance: boolean
      showBlocked: boolean
      showTentative: boolean
      showCancelled: boolean
    }
  }
  
  search: {
    query: string
    searchIn: ["client", "booking_id", "equipment", "notes"]
    
    results: SearchResult[]
    
    actions: {
      jumpToDate: (result: SearchResult) => void
      highlight: (result: SearchResult) => void
    }
  }
  
  sync: {
    realTime: boolean
    updateInterval: number
    
    conflicts: {
      detectOnUpdate: boolean
      highlightConflicts: boolean
      autoResolve: boolean
    }
    
    notifications: {
      newBooking: boolean
      modification: boolean
      cancellation: boolean
    }
  }
  
  export: {
    formats: ["PDF", "Excel", "iCal", "Google Calendar"]
    
    options: {
      dateRange: DateRange
      resources: string[]
      includeDetails: boolean
      includeFinancials: boolean
    }
  }
  
  customization: {
    colors: {
      byStatus: Record<string, string>
      byResourceType: Record<string, string>
      byPriority: Record<string, string>
    }
    
    views: {
      defaultView: ViewType
      startDay: "sunday" | "monday"
      startHour: number
      endHour: number
      slotDuration: number
    }
    
    labels: {
      showClientNames: boolean
      showEquipmentNames: boolean
      showPrices: boolean
      abbreviate: boolean
    }
  }
}
```

**UI - Week View:**
```
┌───────────────────────────────────────────────────────────────────┐
│ Calendar                    Jan 28 - Feb 3, 2026        [Week ▼]  │
├───────────────────────────────────────────────────────────────────┤
│ Resources: [Equipment ▼] [Studios ▼]   Status: [All ▼]  [Search] │
├───────────────────────────────────────────────────────────────────┤
│         Mon 28  Tue 29  Wed 30  Thu 31  Fri 1   Sat 2   Sun 3   │
│ ┌────┬────────┬────────┬────────┬────────┬────────┬────────┬─────┐│
│ │08:00│        │        │        │        │        │        │     ││
│ ├────┼────────┼────────┼────────┼────────┼────────┼────────┼─────┤│
│ │09:00│ ████  │        │  ████  │        │ ████   │        │     ││
│ │    │BK-1234│        │BK-1236│        │BK-1238│        │     ││
│ ├────┼────────┼────────┼────────┼────────┼────────┼────────┼─────┤│
│ │10:00│ ████  │ ████   │  ████  │ ████   │ ████   │ ████   │     ││
│ │    │BK-1234│BK-1235│BK-1236│BK-1237│BK-1238│BK-1239│     ││
│ ├────┼────────┼────────┼────────┼────────┼────────┼────────┼─────┤│
│ │11:00│        │ ████   │        │ ████   │        │ ████   │     ││
│ │    │        │BK-1235│        │BK-1237│        │BK-1239│     ││
│ └────┴────────┴────────┴────────┴────────┴────────┴────────┴─────┘│
│                                                                   │
│ [+ New Booking] [Block Time] [View Conflicts] [Export]           │
└───────────────────────────────────────────────────────────────────┘
```

---

# 🗂️ القسم الرابع: AI & Recommendations

## 4.1 `/admin/ai/recommendations` (جديد - مهم للإيرادات)

### **الهدف:**
نظام التوصيات الذكية لزيادة القيمة والمبيعات

```typescript
RecommendationsEngine {
  rules: {
    create: {
      name: string
      description: string
      type: "complete_kit" | "accessory" | "upgrade" | "bundle"
      priority: number
      
      trigger: {
        items: string[] // equipment IDs
        condition: "any" | "all"
        context: {
          rentalDuration: { min?: number, max?: number }
          clientType: string[]
          orderValue: { min?: number, max?: number }
        }
      }
      
      recommendations: {
        items: {
          equipmentId: string
          priority: number
          reason: string // "Compatible with", "Often rented together"
          
          discount: {
            enabled: boolean
            type: "percentage" | "fixed"
            value: number
          }
        }[]
        
        maxShow: number // how many to show at once
        
        presentation: {
          title: string
          description: string
          position: "product_page" | "cart" | "checkout"
        }
      }
      
      performance: {
        impressions: number
        clicks: number
        conversions: number
        revenue: number
        conversionRate: number
      }
    }
  }
  
  aiPowered: {
    enabled: boolean
    models: {
      collaborativeFiltering: {
        enabled: boolean
        basedOn: "booking_history" | "client_behavior"
      }
      
      contentBased: {
        enabled: boolean
        features: ["category", "brand", "specifications"]
      }
      
      hybrid: {
        enabled: boolean
        weights: {
          collaborative: number
          contentBased: number
          rulesBased: number
        }
      }
    }
    
    learning: {
      autoOptimize: boolean
      updateFrequency: "daily" | "weekly"
      minDataPoints: number
    }
  }
  
  testing: {
    abTesting: {
      enabled: boolean
      experiments: {
        id: string
        name: string
        variants: {
          control: RecommendationRule
          variant: RecommendationRule
        }
        traffic: number // % to variant
        metrics: PerformanceMetrics
        winner?: "control" | "variant"
      }[]
    }
  }
  
  analytics: {
    overview: {
      totalImpressions: number
      totalClicks: number
      totalConversions: number
      totalRevenue: number
      avgCTR: number
      avgConversionRate: number
      avgOrderIncrease: number
    }
    
    topRules: RecommendationRule[]
    
    insights: {
      bestPerformingCategories: string[]
      optimalDiscountRange: [number, number]
      bestPlacements: string[]
    }
  }
}
```

---

## 4.2 `/admin/dynamic-pricing` (تفعيل - مهم جداً للإيرادات)

### **الوضع الحالي:**
- ❌ Placeholder في sidebar
- ❌ غير مفعل نهائياً

### **المطلوب:**
نظام تسعير ديناميكي يعتمد على الطلب

```typescript
DynamicPricing {
  strategy: {
    type: "demand_based" | "time_based" | "utilization_based" | "hybrid"
    
    demandBased: {
      factors: {
        currentBookings: {
          weight: number
          threshold: number // % utilization
        }
        
        upcomingBookings: {
          weight: number
          lookahead: number // days
        }
        
        seasonality: {
          weight: number
          patterns: SeasonalPattern[]
        }
        
        dayOfWeek: {
          weight: number
          premiumDays: string[]
        }
      }
      
      adjustments: {
        min: number // -20%
        max: number // +50%
        increments: number // 5%
      }
    }
    
    timeBased: {
      leadTime: {
        lastMinute: {
          threshold: number // hours
          adjustment: number // % discount
        }
        
        advanceBooking: {
          threshold: number // days
          adjustment: number // % discount
        }
      }
      
      duration: {
        longTerm: {
          threshold: number // days
          adjustment: number // % discount
        }
        
        weekend: {
          adjustment: number
        }
      }
    }
    
    utilizationBased: {
      targets: {
        optimal: number // 75%
        high: number // 90%
        low: number // 50%
      }
      
      actions: {
        belowOptimal: "decrease_price"
        aboveOptimal: "increase_price"
        high: "premium_pricing"
      }
    }
  }
  
  rules: {
    equipment: {
      byCategory: {
        categoryId: string
        enabled: boolean
        strategy: PricingStrategy
        limits: { min: number, max: number }
      }[]
      
      byItem: {
        equipmentId: string
        override: boolean
        customStrategy: PricingStrategy
      }[]
    }
    
    studio: {
      byStudio: {
        studioId: string
        peakHours: { start: string, end: string }[]
        peakDays: string[]
        peakAdjustment: number
      }[]
    }
  }
  
  ai: {
    enabled: boolean
    
    learning: {
      dataPoints: [
        "historical_bookings",
        "pricing_history",
        "competitor_prices",
        "market_trends",
        "conversion_rates"
      ]
      
      updateFrequency: "realtime" | "daily" | "weekly"
      
      minDataRequired: number
    }
    
    optimization: {
      goal: "maximize_revenue" | "maximize_utilization" | "balanced"
      
      constraints: {
        maintainMargin: number // %
        avoidDramaticChanges: boolean
        maxPriceChange: number // % per day
      }
    }
    
    predictions: {
      demandForecast: {
        horizon: number // days
        confidence: number
      }
      
      optimalPricing: {
        byItem: { id: string, price: number, confidence: number }[]
        expectedRevenue: number
        expectedUtilization: number
      }
    }
  }
  
  monitoring: {
    realtime: {
      currentPrices: { id: string, basePrice: number, dynamicPrice: number }[]
      adjustments: PriceAdjustment[]
      performance: PerformanceMetrics
    }
    
    alerts: {
      priceChanges: boolean
      demandSpikes: boolean
      competitorPricing: boolean
    }
  }
  
  testing: {
    abTests: {
      active: ABTest[]
      results: TestResult[]
    }
    
    simulation: {
      runScenario: (params: ScenarioParams) => Simulation
      compareStrategies: (strategies: Strategy[]) => Comparison
    }
  }
  
  reporting: {
    performance: {
      revenueImpact: number
      utilizationImprovement: number
      avgPriceAdjustment: number
      conversionRateChange: number
    }
    
    insights: {
      bestPerformingRules: Rule[]
      optimalPricingWindows: TimeWindow[]
      recommendations: Recommendation[]
    }
  }
}
```

---

بسبب طول المحتوى، سأكمل باقي الأقسام في الجزء التالي...

