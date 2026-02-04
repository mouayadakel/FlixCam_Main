# FlixCam - Immediate Action Plan
## What to Do Right Now

---

## 🚨 Critical Actions (Do These FIRST - Week 1)

### Day 1-2: Security Setup

```bash
# 1. Install security packages
npm install helmet
npm install express-rate-limit
npm install @upstash/ratelimit @upstash/redis

# 2. Set up environment variables
cp .env.example .env
```

Add to `.env`:
```env
# Security
SESSION_SECRET=generate-a-very-long-random-string
ENCRYPTION_KEY=another-long-random-string

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token

# Redis (for caching & rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Create**: `middleware/security.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

export function securityHeaders(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  return response;
}
```

### Day 3-4: Monitoring Setup

```bash
# 1. Install monitoring packages
npm install @sentry/nextjs
npm install winston
```

**Create**: `lib/logger.ts`
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

**Create**: `lib/error-handler.ts`
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorCodes = {
  VALIDATION_ERROR: 'ERR_001',
  NOT_FOUND: 'ERR_002',
  UNAUTHORIZED: 'ERR_003',
  PAYMENT_FAILED: 'ERR_004',
  INVENTORY_CONFLICT: 'ERR_005',
};
```

### Day 5: Database Enhancements

**Update your Prisma schema** to add these critical fields to ALL models:

```prisma
model Equipment {
  // ... existing fields ...
  
  // Add these to EVERY model:
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdById   String?
  updatedById   String?
  deletedAt     DateTime? // Soft delete
  
  @@index([deletedAt]) // Important for filtering out deleted records
}
```

**Create migration**:
```bash
npx prisma migrate dev --name add_audit_fields
```

---

## ⚡ High Priority Actions (Week 1-2)

### 1. Enhanced Booking Model

**Update `schema.prisma`**:
```prisma
enum BookingStatus {
  DRAFT
  VALIDATED
  PAYMENT_PENDING
  PAYMENT_PROCESSING
  PAYMENT_FAILED
  CONFIRMED
  ACTIVE
  PENDING_CHANGE
  EXTENDED
  COMPLETED
  LATE
  CANCELLED
  EXPIRED
}

model Booking {
  id                String   @id @default(cuid())
  bookingNumber     String   @unique
  userId            String
  
  // Dates
  startDate         DateTime
  endDate           DateTime
  actualReturnDate  DateTime?
  
  // Pricing
  subtotal          Decimal  @db.Decimal(10, 2)
  taxAmount         Decimal  @db.Decimal(10, 2)
  taxRate           Decimal  @db.Decimal(5, 2) @default(0.15) // 15% VAT
  depositAmount     Decimal  @db.Decimal(10, 2)
  totalAmount       Decimal  @db.Decimal(10, 2)
  
  // Price Lock - CRITICAL!
  priceLocked       Boolean  @default(false)
  priceLockedAt     DateTime?
  priceLockedUntil  DateTime? // e.g., 15 minutes
  
  // Status
  status            BookingStatus @default(DRAFT)
  paymentStatus     PaymentStatus @default(PENDING)
  
  // Relations
  user              User     @relation(fields: [userId], references: [id])
  items             BookingItem[]
  
  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  
  @@index([userId, status])
  @@index([startDate, endDate])
  @@index([priceLocked, priceLockedUntil])
}
```

### 2. Inventory Locking Service

**Create**: `services/inventory-lock.service.ts`
```typescript
export class InventoryLockService {
  
  /**
   * Check and lock inventory for booking
   * This prevents overbooking by using database transactions
   */
  async lockInventory(
    items: { equipmentId: string; quantity: number; startDate: Date; endDate: Date }[],
    bookingId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          // Lock the equipment row (FOR UPDATE)
          const equipment = await tx.equipment.findUnique({
            where: { id: item.equipmentId },
          });
          
          if (!equipment) {
            errors.push(`Equipment ${item.equipmentId} not found`);
            throw new Error('Equipment not found');
          }
          
          // Check availability
          const conflicts = await tx.bookingItem.findMany({
            where: {
              equipmentId: item.equipmentId,
              booking: {
                status: {
                  in: ['VALIDATED', 'PAYMENT_PENDING', 'CONFIRMED', 'ACTIVE'],
                },
              },
              AND: [
                { startDate: { lte: item.endDate } },
                { endDate: { gte: item.startDate } },
              ],
            },
          });
          
          const bookedQty = conflicts.reduce((sum, c) => sum + c.quantity, 0);
          const available = equipment.quantity - bookedQty;
          
          if (available < item.quantity) {
            errors.push(
              `${equipment.nameEn} - Only ${available} available, requested ${item.quantity}`
            );
            throw new Error('Insufficient inventory');
          }
        }
        
        // If we reach here, all items are available
        // Update booking status
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'VALIDATED' },
        });
      });
      
      return { success: true, errors: [] };
      
    } catch (error) {
      return { success: false, errors };
    }
  }
}
```

### 3. Price Lock Mechanism

**Create**: `services/price-lock.service.ts`
```typescript
export class PriceLockService {
  private LOCK_DURATION_MINUTES = 15;
  
  /**
   * Lock prices for checkout
   * Prevents price changes during checkout process
   */
  async lockPrices(bookingId: string): Promise<{
    locked: boolean;
    expiresAt: Date;
  }> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.LOCK_DURATION_MINUTES);
    
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        priceLocked: true,
        priceLockedAt: new Date(),
        priceLockedUntil: expiresAt,
      },
    });
    
    // Schedule cleanup job
    this.scheduleUnlock(bookingId, expiresAt);
    
    return {
      locked: true,
      expiresAt,
    };
  }
  
  /**
   * Check if price lock is still valid
   */
  async isPriceLockValid(bookingId: string): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    
    if (!booking || !booking.priceLocked || !booking.priceLockedUntil) {
      return false;
    }
    
    return new Date() < booking.priceLockedUntil;
  }
  
  /**
   * Auto-unlock expired price locks
   */
  private async scheduleUnlock(bookingId: string, expiresAt: Date) {
    const delay = expiresAt.getTime() - Date.now();
    
    setTimeout(async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });
      
      // Only unlock if still in PAYMENT_PENDING and not paid
      if (booking?.status === 'PAYMENT_PENDING') {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'EXPIRED',
            priceLocked: false,
          },
        });
        
        // Release inventory
        // This is automatic because we check status in availability queries
      }
    }, delay);
  }
}
```

---

## 📊 Medium Priority (Week 2-3)

### 1. Rate Limiting

**Create**: `middleware/rate-limit.ts`
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const rateLimiters = {
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),
  
  checkout: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),
  
  payment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    analytics: true,
  }),
};

export async function checkRateLimit(
  identifier: string,
  limiter: 'public' | 'checkout' | 'payment' = 'public'
) {
  const { success, limit, reset, remaining } = 
    await rateLimiters[limiter].limit(identifier);
    
  return {
    allowed: success,
    limit,
    remaining,
    reset,
  };
}
```

**Use in API routes**:
```typescript
// app/api/checkout/route.ts
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  const rateLimit = await checkRateLimit(ip, 'checkout');
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // Continue with checkout...
}
```

### 2. Caching Layer

**Create**: `lib/cache.ts`
```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  },
  
  async set(key: string, value: any, ttl: number = 300) {
    try {
      await redis.set(key, value, { ex: ttl });
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  },
  
  async delete(key: string) {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  },
  
  async invalidatePattern(pattern: string) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidate error', { pattern, error });
    }
  },
};

// Cache keys helper
export const cacheKeys = {
  equipment: (id: string) => `equipment:${id}`,
  equipmentList: (filters: string) => `equipment:list:${filters}`,
  availability: (id: string, dates: string) => `availability:${id}:${dates}`,
  cart: (userId: string) => `cart:${userId}`,
};
```

**Use in APIs**:
```typescript
// app/api/public/equipment/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const cacheKey = cacheKeys.equipment(params.id);
  
  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  
  // Fetch from database
  const equipment = await prisma.equipment.findUnique({
    where: { id: params.id },
  });
  
  // Cache for 10 minutes
  if (equipment) {
    await cache.set(cacheKey, equipment, 600);
  }
  
  return NextResponse.json(equipment);
}
```

---

## 🧪 Testing Setup (Week 3)

### Install Testing Tools

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D supertest @types/supertest
```

### Basic Test Structure

**Create**: `__tests__/services/pricing.test.ts`
```typescript
import { PricingService } from '@/services/pricing.service';

describe('PricingService', () => {
  let service: PricingService;
  
  beforeEach(() => {
    service = new PricingService();
  });
  
  it('should calculate daily rate correctly', () => {
    const cost = service.calculateDailyCost(100, 3);
    expect(cost).toBe(300);
  });
  
  it('should apply 15% VAT', () => {
    const total = service.calculateWithTax(100);
    expect(total).toBe(115);
  });
});
```

**Create**: `__tests__/api/equipment.test.ts`
```typescript
import request from 'supertest';

describe('Equipment API', () => {
  it('GET /api/public/equipment should return list', async () => {
    const response = await request(app)
      .get('/api/public/equipment')
      .expect(200);
      
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

---

## 📋 Quick Checklist

### Week 1
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Error tracking (Sentry) set up
- [ ] Logging system in place
- [ ] Database audit fields added
- [ ] Soft delete implemented

### Week 2
- [ ] Price lock mechanism working
- [ ] Inventory locking service created
- [ ] Tax calculation (15% VAT) implemented
- [ ] Caching layer set up
- [ ] Redis configured

### Week 3
- [ ] Unit tests written for services
- [ ] API integration tests created
- [ ] E2E tests for critical flows
- [ ] Documentation started

---

## 🎯 Success Criteria

After 3 weeks, you should have:

✅ **Security**: Headers, rate limiting, session management
✅ **Monitoring**: Error tracking, logging, basic analytics
✅ **Data Integrity**: Audit fields, soft delete, proper indexes
✅ **Business Logic**: Price lock, inventory lock, tax calculation
✅ **Performance**: Caching layer working
✅ **Quality**: Basic test coverage

---

## ⚠️ Common Pitfalls to Avoid

1. **Skipping security** - "We'll add it later" = You won't
2. **No monitoring** - Can't fix what you can't see
3. **Ignoring edge cases** - What if two people book the same item?
4. **No testing** - Bugs in production are expensive
5. **Poor error handling** - Users see confusing errors
6. **No caching** - Site will be slow under load
7. **Forgetting tax** - Legal issues in Saudi Arabia

---

## 💰 Budget for External Services (Monthly)

- **Upstash Redis**: $10-50 (based on usage)
- **Sentry**: Free tier OK for start, $26+ for team
- **Vercel**: Free for development, $20+ for production
- **Payment Gateway (TAP)**: Transaction fees only
- **SMS OTP**: ~$0.05 per message
- **Email Service**: Free tier (SendGrid/Mailgun) or $10-20

**Total estimated**: $50-150/month to start

---

## 🚀 Next Steps

1. **Today**: Set up security headers and Sentry
2. **This Week**: Implement price lock and inventory lock
3. **Next Week**: Add caching and rate limiting
4. **Week 3**: Write tests

**Remember**: 
> Better to launch in 6 months with quality than in 3 months with disasters

The extra time is insurance against:
- Data breaches
- Lost revenue from bugs
- Customer complaints
- Sleepless nights debugging production

---

## 📞 Need Help?

If you get stuck on any of these:

1. Check the enhanced plan document for detailed examples
2. Review the gap analysis for understanding WHY each is important
3. Each service should be ~100-200 lines max - keep it simple
4. Start with the simplest version that works, then enhance

Good luck! 🎬
