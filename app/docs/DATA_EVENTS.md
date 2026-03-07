# Event System Architecture

## Event-Driven Philosophy

**Every action emits events. No logic without events.**

The event system is the backbone of the platform, enabling decoupled processing, audit trails, and extensibility.

## Event System Overview

### Core Principles

- **Events stored in database**: All events persisted for audit
- **Async processing**: Event handlers execute asynchronously
- **Decoupled handlers**: Handlers are independent and replaceable
- **Event replay**: Events can be replayed for debugging/recovery

## Event Structure

```typescript
interface Event {
  id: string
  eventName: EventName
  payload: EventPayload
  userId?: string
  resourceType?: string
  resourceId?: string
  timestamp: Date
  processed: boolean
  processedAt?: Date
}
```

## Core Events

### Booking Events

- `booking.created` - Booking created in DRAFT state
- `booking.risk_check` - Risk check initiated
- `booking.payment_pending` - Payment intent created
- `booking.confirmed` - Payment successful, booking confirmed
- `booking.active` - Equipment picked up
- `booking.returned` - Equipment returned
- `booking.closed` - Booking closed
- `booking.cancelled` - Booking cancelled
- `booking.soft_lock_created` - Soft inventory lock created
- `booking.soft_lock_released` - Soft inventory lock released

### Payment Events

- `payment.intent_created` - Payment intent created
- `payment.success` - Payment successful
- `payment.failed` - Payment failed
- `payment.refund_requested` - Refund requested (requires approval)
- `payment.refund_approved` - Refund approved
- `payment.refund_processed` - Refund processed

### Contract Events

- `contract.generated` - Contract generated
- `contract.signed` - Contract signed
- `contract.version_updated` - Contract terms version updated

### Approval Events

- `approval.requested` - Approval request created
- `approval.approved` - Approval granted
- `approval.rejected` - Approval rejected

### Equipment Events

- `equipment.created` - Equipment created
- `equipment.updated` - Equipment updated
- `equipment.deleted` - Equipment soft deleted
- `equipment.damage_reported` - Damage reported

### User Events

- `user.created` - User account created
- `user.updated` - User account updated
- `user.login` - User logged in
- `user.logout` - User logged out

## Event Bus Implementation

```typescript
// lib/events/event-bus.ts
export class EventBus {
  static async emit<T extends EventName>(event: T, payload: EventPayload[T]): Promise<void> {
    // 1. Store event in database
    await prisma.event.create({
      data: {
        eventName: event,
        payload: payload as any,
        timestamp: new Date(),
      },
    })

    // 2. Get handlers
    const handlers = this.getHandlers(event)

    // 3. Execute async (non-blocking)
    await Promise.allSettled(handlers.map((handler) => handler(payload)))
  }
}
```

## Event Handlers

### Handler Structure

```typescript
// lib/events/handlers/booking-handlers.ts
export async function handleBookingCreated(payload: EventPayload['booking.created']) {
  const { booking, userId } = payload

  // Parallel async operations
  await Promise.all([
    // Send email
    EmailService.send({
      to: booking.customer.email,
      template: 'booking-created',
      data: { booking },
    }),

    // Notify warehouse
    NotificationService.notify({
      recipientRoles: ['warehouse-manager'],
      message: `New booking created: ${booking.id}`,
      type: 'info',
    }),

    // Track analytics
    AnalyticsService.track({
      event: 'booking_created',
      properties: {
        bookingId: booking.id,
        equipmentCount: booking.equipmentIds.length,
        totalValue: booking.totalPrice,
      },
    }),
  ])
}
```

## Event Storage

### Database Model

```prisma
model Event {
  id          String   @id @default(cuid())
  eventName   String
  payload     Json
  userId      String?
  resourceType String?
  resourceId  String?
  timestamp   DateTime @default(now())
  processed   Boolean  @default(false)
  processedAt DateTime?

  @@index([eventName])
  @@index([timestamp])
  @@index([processed])
}
```

## Event Processing

### Async Processing

- Events are stored immediately
- Handlers execute asynchronously
- Non-blocking for user requests
- Error handling per handler

### Event Replay

- Events can be replayed for debugging
- Useful for recovery scenarios
- Idempotent handlers required

## Event-Driven Workflows

### Example: Booking Confirmation

1. Payment success → `payment.success` event
2. Handler: Update booking status to CONFIRMED
3. Handler: Generate contract
4. Handler: Send confirmation email
5. Handler: Notify warehouse
6. Handler: Track analytics

### Example: Refund Workflow

1. Refund requested → `payment.refund_requested` event
2. Handler: Create approval request
3. Handler: Notify finance team
4. Approval granted → `payment.refund_approved` event
5. Handler: Process refund
6. Handler: Update booking status
7. Handler: Send confirmation email

## Benefits

- **Decoupling**: Services don't directly depend on each other
- **Extensibility**: Easy to add new handlers
- **Audit trail**: All events stored for compliance
- **Debugging**: Event replay for troubleshooting
- **Scalability**: Async processing handles load

---

**Last Updated**: January 26, 2026
