# Product Requirements Document (PRD)

## Product Vision

Building an **Operating System for Cinematic Production**, not just a booking website.

The platform must:

- Understand production projects (type, risks, needs)
- Make intelligent, explainable decisions
- Minimize human intervention
- Be legally and financially secure
- Be scalable (cities, countries, marketplace)

## Core Goals

- Understand production projects
- Reduce human intervention
- Intelligent, explainable decisions
- High legal and financial security

## Business Model

- **Hybrid rental**: Equipment + Studio
- **Booking after payment only**: No bookings without payment confirmation
- **Dynamic pricing**: Optional feature toggle
- **Smart bundles**: Studio + Equipment combinations
- **Add-ons**: Assistant, Technician, Delivery, Insurance levels

## Target Users

### External Users

- Production Houses
- Agencies
- Freelancers
- Podcasters
- Content Creators

### Internal Roles

- admin
- warehouse-manager
- technician
- sales-manager
- accountant
- customer-service
- marketing-manager
- data-entry

### AI-Aware Roles (New)

- risk-manager
- approval-agent
- auditor
- ai-operator

## Core Modules

1. **Equipment Management**
   - Categories/Sub-categories
   - Brands
   - Metadata lifecycle
   - Condition tracking
   - Maintenance & inspections
   - Damage reports
   - Media library
   - QR/asset tracking

2. **Studio Management**
   - Independent resource
   - Flexible time slots
   - Setup/cleaning buffers
   - Add-ons
   - Gallery-based booking

3. **Booking Engine**
   - State machine workflow
   - Availability checking
   - Compatibility validation
   - Soft inventory locks
   - Contract acceptance
   - Payment integration

4. **Payments & Finance**
   - Tap Payments integration
   - Deposit calculation (risk-based)
   - Refund approval workflow
   - Invoice generation
   - 15% VAT calculation

5. **Contracts & Legal**
   - Versioned terms
   - Immutable contracts
   - E-signature
   - Multi-language support

6. **Roles & Security**
   - Policy-based authorization
   - No admin bypass
   - Audit logging
   - Approval workflows

7. **AI & Automation** (Phase 2)
   - Risk scoring
   - Equipment recommendations
   - Smart bundles
   - Demand prediction

## Key Business Rules

- **Registration required**: No guest checkout
- **Risk check**: Conditional (auto for low-risk, manual for high-risk)
- **Deposit**: Based on equipment value (formula TBD)
- **Tax**: 15% VAT on all bookings
- **Studio booking**: Flexible (any start/end time)
- **Equipment quantity**: Multiple units can be booked
- **Packages/Bundles**: Phase 2
- **AI Features**: Phase 2

## Success Metrics

- Booking conversion rate
- Average booking value
- Equipment utilization
- Customer satisfaction
- Time to booking confirmation
- Payment success rate

---

**Last Updated**: January 26, 2026
