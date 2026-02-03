# Booking Engine

## Booking Philosophy

**Booking = Workflow (not form)**

A booking is a state machine with mandatory checks at each transition.

## State Machine

```
DRAFT
  → (conditional risk check) → RISK_CHECK (auto for low-risk, manual for high-risk)
  → (proceed to payment) → PAYMENT_PENDING
  → (payment success) → CONFIRMED
  → (pickup) → ACTIVE
  → (return) → RETURNED
  → (closed) → CLOSED

Any state → (cancel) → CANCELLED
```

## Booking States

### DRAFT
- Initial state when booking is created
- Can be edited freely
- No payment required
- No inventory lock

### RISK_CHECK
- Conditional state based on risk assessment
- Auto-transition for low-risk bookings
- Manual review for high-risk bookings
- Admin can review and transition

### PAYMENT_PENDING
- Payment intent created
- Waiting for payment confirmation
- Soft inventory lock active (10-15 min TTL)
- Cannot edit booking

### CONFIRMED
- Payment successful
- Booking confirmed
- Inventory reserved
- Contract generated

### ACTIVE
- Equipment picked up
- Rental period started
- Cannot cancel
- Can extend (with approval)

### RETURNED
- Equipment returned
- Inspection pending
- Damage assessment
- Deposit refund calculation

### CLOSED
- Inspection complete
- All charges finalized
- Deposit refunded (if applicable)
- Booking archived

### CANCELLED
- Booking cancelled from any state
- Soft delete applied
- Refund processed (if payment made)
- Inventory released

## Mandatory Checks

### 1. Availability Check
- Equipment availability for date range
- Studio availability for time slots
- No conflicts with existing bookings
- Quantity validation

### 2. Compatibility Check
- Equipment compatibility (if applicable)
- Studio capacity
- Access requirements

### 3. Soft Inventory Lock
- 10-15 minute TTL
- Prevents double-booking
- Auto-releases on timeout
- Manual release available

### 4. Contract Acceptance
- Terms version check
- E-signature required
- Contract snapshot created
- Immutable after signing

### 5. Payment Success
- Payment confirmation required
- Cannot confirm without payment
- Refund workflow for cancellations

## Risk Check Logic

### Risk Factors
- **Booking amount**: Higher amount = higher risk
- **Customer history**: Past bookings, cancellations, damages
- **Equipment value**: High-value equipment = higher risk
- **Rental duration**: Longer duration = higher risk

### Risk Assessment
- **Low risk**: Auto-approve, auto-transition to PAYMENT_PENDING
- **High risk**: Manual review required, stay in RISK_CHECK
- **Admin review**: Admin can review and transition

## Booking Creation Flow

1. **User creates booking** (DRAFT state)
2. **Availability check** (equipment + studio)
3. **Compatibility validation**
4. **Risk assessment** (conditional)
5. **Risk check** (if high-risk, manual review)
6. **Payment intent** (PAYMENT_PENDING)
7. **Soft lock** (10-15 min TTL)
8. **Payment success** (CONFIRMED)
9. **Contract generation**
10. **Event emission** (booking.confirmed)

## Registration Requirement

- **No guest checkout**: Registration required before booking
- **User account**: Must be logged in
- **Profile completion**: Basic profile required

## Multiple Equipment Units

- **Quantity support**: Multiple units of same equipment
- **Availability check**: Validates total available quantity
- **Inventory management**: Tracks individual units

## Studio Booking

- **Flexible timing**: Any start/end time (not fixed slots)
- **Buffer calculation**: Setup, cleaning, reset times
- **Blackout dates**: Maintenance, holidays
- **Add-ons**: Assistant, technician, delivery

## Pricing Calculation

- **Base pricing**: Daily, weekly, monthly rates
- **Weekend logic**: Fri-Mon = 1 day
- **Deposit**: Based on equipment value (formula TBD)
- **VAT**: 15% on all bookings
- **Bundles**: Studio + Equipment discounts (Phase 2)

## Events

### Core Events
- `booking.created` - Booking created in DRAFT
- `booking.risk_check` - Risk check initiated
- `booking.payment_pending` - Payment intent created
- `booking.confirmed` - Payment successful, booking confirmed
- `booking.active` - Equipment picked up
- `booking.returned` - Equipment returned
- `booking.closed` - Booking closed
- `booking.cancelled` - Booking cancelled

---

**Last Updated**: January 26, 2026
