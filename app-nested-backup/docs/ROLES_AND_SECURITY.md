# Roles & Security Doctrine

## Security Doctrine (Non-Negotiable)

### Rule 1: No Admin Bypass

**ABSOLUTE BAN**: Admin accounts are the #1 attack vector. Every action must be auditable and policy-controlled.

```typescript
// ❌ FORBIDDEN
if (user.role === 'admin') return true

// ✅ MANDATORY
const policy = await BookingPolicy.canDelete(userId, bookingId)
if (!policy.allowed) {
  throw new PolicyViolationError(policy.reason)
}
```

### Rule 2: Financial Operations = Approval Workflow

All financial changes require human approval and audit trail.

```typescript
// ❌ FORBIDDEN - Direct financial changes
await prisma.payment.update({ data: { status: 'refunded' } })

// ✅ MANDATORY - Request → Approve → Execute → Audit
const approval = await ApprovalService.request({
  action: 'payment.refund',
  resourceId: paymentId,
  requestedBy: userId,
  reason: 'Customer request',
  requiresRoles: ['admin', 'finance-director'],
})
```

### Rule 3: Soft Delete Only

No hard deletes without approval. All deletions are soft with audit trail.

```typescript
// ❌ FORBIDDEN
await prisma.booking.delete({ where: { id } })

// ✅ MANDATORY
await prisma.booking.update({
  where: { id },
  data: {
    deletedAt: new Date(),
    deletedBy: userId,
    status: 'cancelled',
  },
})
```

### Rule 4: All Critical Actions Emit Events

Every important action must emit an event for audit and processing.

```typescript
// ✅ MANDATORY
await EventBus.emit('booking.created', {
  booking,
  userId,
  timestamp: new Date(),
})
```

## Roles

### Base Roles

- **admin**: Full system access (still goes through policies)
- **warehouse-manager**: Equipment management, inventory
- **technician**: Equipment maintenance, inspections
- **sales-manager**: Booking management, customer relations
- **accountant**: Financial operations, invoices, payments
- **customer-service**: Customer support, booking assistance
- **marketing-manager**: Marketing campaigns, analytics
- **data-entry**: Data entry, content management

### AI-Aware Roles (New)

- **risk-manager**: Risk assessment, approval decisions
- **approval-agent**: Handle approval requests
- **auditor**: Review audit logs, compliance
- **ai-operator**: AI system management

## Permissions

### Permission Structure

- **Resource-based**: `booking.create`, `equipment.edit`, `payment.refund`
- **Action-based**: `create`, `read`, `update`, `delete`, `approve`
- **Scope-based**: `own`, `team`, `all`

### Core Permissions

- `booking.create`, `booking.edit`, `booking.delete`, `booking.view`
- `equipment.create`, `equipment.edit`, `equipment.delete`, `equipment.view`
- `payment.process`, `payment.refund`, `payment.approve`
- `user.create`, `user.edit`, `user.delete`, `user.view`
- `audit.view`, `audit.export`
- `settings.edit`, `settings.view`

## Policy-Based Authorization

Every model has a policy class. No authorization logic in controllers/routes.

```typescript
// lib/policies/booking.policy.ts
export class BookingPolicy {
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await hasPermission(userId, 'booking.create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'Missing permission: booking.create',
      }
    }
    return { allowed: true }
  }
}
```

## Audit Logging

### Mandatory Audit Fields

Every model must include:

- `createdAt`, `createdBy`
- `updatedAt`, `updatedBy`
- `deletedAt`, `deletedBy` (soft delete)

### Critical Actions Logged

- User login/logout
- Booking create/edit/delete
- Payment operations
- Permission changes
- Feature flag toggles
- Approval requests/decisions

### Audit Log Structure

```typescript
{
  action: 'booking.created',
  userId: string,
  resourceType: 'booking',
  resourceId: string,
  ipAddress: string,
  userAgent: string,
  metadata: Record<string, any>,
  timestamp: Date
}
```

## Rate Limiting

- **API endpoints**: 100 requests/hour per IP
- **Auth endpoints**: 10 attempts/15 minutes per IP
- **429 responses**: Proper error messages
- **Logging**: All rate limit violations logged

## Two-Factor Authentication

- **Required for**: Admin accounts
- **Optional for**: Other roles
- **Methods**: TOTP, SMS (Phase 2)

## Security Checklist

- [ ] No admin bypass (everyone goes through policies)
- [ ] Financial operations require approval
- [ ] Soft delete only (no hard delete without approval)
- [ ] All critical actions emit events
- [ ] Audit logging for all sensitive operations
- [ ] Permission checks in services
- [ ] Policy checks for business rules
- [ ] Input validation with Zod
- [ ] Rate limiting on API routes
- [ ] 2FA for admin accounts

---

**Last Updated**: January 26, 2026
