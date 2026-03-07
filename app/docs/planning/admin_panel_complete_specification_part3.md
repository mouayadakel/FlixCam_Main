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
