/**
 * @file config.ts
 * @description NextAuth.js configuration
 * @module lib/auth
 */

import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

interface AssignedRoleRecord {
  role: {
    name: string
  }
}

async function getActiveAssignedRoleNames(
  prismaClient: {
    assignedUserRole: {
      findMany: (args: {
        where: {
          userId: string
          OR: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>
        }
        select: { role: { select: { name: true } } }
      }) => Promise<AssignedRoleRecord[]>
    }
  },
  userId: string
): Promise<string[]> {
  const assignedRoles = await prismaClient.assignedUserRole.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  })

  return assignedRoles.map((item) => item.role.name)
}

export const authConfig: NextAuthConfig = {
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = String(credentials.email).trim().toLowerCase()

        const { loginSchema } = await import('@/lib/validators/auth.validator')
        const parsed = loginSchema.safeParse(credentials)

        let ip = '127.0.0.1'
        let userAgent = 'Unknown'
        try {
          const { headers } = await import('next/headers')
          const headersList = await headers()
          ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1'
          userAgent = headersList.get('user-agent') || 'Unknown'
        } catch (e) {}

        const { prisma } = await import('@/lib/db/prisma')

        const safeLogAttempt = async (data: {
          email: string
          ipAddress: string
          userAgent: string
          status: string
          userId?: string
        }) => {
          try {
            if ('loginAttempt' in prisma && typeof (prisma as { loginAttempt?: { create: (arg: { data: unknown }) => Promise<unknown> } }).loginAttempt?.create === 'function') {
              await (prisma as { loginAttempt: { create: (arg: { data: unknown }) => Promise<unknown> } }).loginAttempt.create({ data })
            }
          } catch {
            // LoginAttempt model may not exist; do not block login
          }
        }

        if (!parsed.success) {
          await safeLogAttempt({
            email: email.slice(0, 255),
            ipAddress: ip,
            userAgent,
            status: 'failed_validation',
          })
          return null
        }

        // Normalize password (trim) so accidental spaces do not cause login failure
        const password = String(parsed.data.password).trim()

        const { checkRateLimitUpstash } = await import('@/lib/utils/rate-limit-upstash')
        const dummyReq = new Request('http://localhost')
        const rateLimit = await checkRateLimitUpstash(dummyReq, 'auth', ip)
        if (!rateLimit.allowed) {
          throw new Error('Too many requests. Please try again later.')
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
        })

        if (!user || user.deletedAt) {
          console.warn('[AUTH][credentials] User not found', { email })
          await safeLogAttempt({ email, ipAddress: ip, userAgent, status: 'failed_user_not_found' })
          return null
        }

        if (user.status !== 'ACTIVE') {
          console.warn('[AUTH][credentials] Account not active', { email, status: user.status })
          throw new Error('AccountNotVerified')
        }

        const lockedUntil = (user as { lockedUntil?: Date | null }).lockedUntil
        if (lockedUntil && new Date(lockedUntil) > new Date()) {
          throw new Error('Account is temporarily locked. Please try again later.')
        }

        // If stored hash does not look like bcrypt, re-seed or run reset-admin-password
        const looksLikeBcrypt =
          typeof user.passwordHash === 'string' &&
          user.passwordHash.length >= 29 &&
          (user.passwordHash.startsWith('$2a$') ||
            user.passwordHash.startsWith('$2b$') ||
            user.passwordHash.startsWith('$2y$'))
        if (!looksLikeBcrypt) {
          console.warn('[AUTH][credentials] User passwordHash is not a bcrypt hash – run db:seed or scripts/reset-admin-password.ts', {
            email,
          })
          await safeLogAttempt({ userId: user.id, email, ipAddress: ip, userAgent, status: 'failed' })
          return null
        }

        const bcrypt = await import('bcryptjs')
        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
          console.warn('[AUTH][credentials] Wrong password', { email })
          await safeLogAttempt({ userId: user.id, email, ipAddress: ip, userAgent, status: 'failed' })

          let failedCount = 0
          try {
            if ('loginAttempt' in prisma && typeof (prisma as { loginAttempt?: { count: (arg: { where: unknown }) => Promise<number> } }).loginAttempt?.count === 'function') {
              const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000)
              failedCount = await (prisma as { loginAttempt: { count: (arg: { where: unknown }) => Promise<number> } }).loginAttempt.count({
                where: {
                  userId: user.id,
                  status: 'failed',
                  createdAt: { gte: fifteenMinsAgo },
                },
              })
            }
          } catch {
            // ignore
          }

          if (failedCount >= 5) {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } as Record<string, unknown>,
              })
            } catch {
              // lockedUntil column may not exist
            }
            try {
              const { EmailService } = await import('@/lib/services/email.service')
              EmailService.send({
                to: user.email,
                subject: 'Security Alert: Account Locked - FlixCam.rent',
                html: '<p>Your account was temporarily locked due to multiple failed login attempts. It will automatically unlock in 15 minutes. If this was not you, please contact support immediately.</p>',
                logToMessageLog: false,
              }).catch(() => {})
            } catch {
              // ignore
            }
            throw new Error('Account is temporarily locked. Please try again later.')
          }
          return null
        }

        await safeLogAttempt({ userId: user.id, email, ipAddress: ip, userAgent, status: 'success' })

        const { STAFF_ROLES_REQUIRING_2FA, validateUserTwoFactorToken } = await import(
          '@/lib/auth/two-factor-auth'
        )
        if (STAFF_ROLES_REQUIRING_2FA.has(user.role) && user.twoFactorEnabled) {
          const otp = String(credentials.otp ?? '').trim()
          if (!otp) {
            throw new Error('TwoFactorRequired')
          }
          const validOtp = await validateUserTwoFactorToken(user.id, otp)
          if (!validOtp) {
            throw new Error('InvalidTwoFactorCode')
          }
        }

        if (lockedUntil) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lockedUntil: null } as Record<string, unknown>,
            })
          } catch {
            // lockedUntil column may not exist
          }
        }

        const assignedRoles = await getActiveAssignedRoleNames(prisma, user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
          assignedRoles,
        }
      },
    }),
    /** Phase 3.2: one-time login after OTP verify (deferred registration). */
    CredentialsProvider({
      id: 'phone-otp',
      name: 'Phone OTP',
      credentials: {
        oneTimeToken: { label: 'One-time token', type: 'text' },
      },
      async authorize(credentials) {
        const token = credentials?.oneTimeToken as string | undefined
        if (!token) return null

        const { cacheGet, cacheDelete } = await import('@/lib/cache')
        const userId = await cacheGet<string>('authToken', token)
        if (!userId) return null

        const { prisma } = await import('@/lib/db/prisma')
        const user = await prisma.user.findUnique({
          where: { id: userId },
        })
        if (!user || user.deletedAt || user.status !== 'ACTIVE') return null

        await cacheDelete('authToken', token)
        const assignedRoles = await getActiveAssignedRoleNames(prisma, user.id)
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
          assignedRoles,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const { prisma } = await import('@/lib/db/prisma')
        const dbUser = await prisma.user.findUnique({
          where: { email: profile.email as string },
        })
        if (!dbUser || dbUser.deletedAt || dbUser.status !== 'ACTIVE') {
          return false
        }
      }

      // Phase 6: Whale Detection
      if (user?.id) {
        import('@/lib/services/messaging-automation.service').then(({ processEventForMessaging }) => {
          processEventForMessaging('user.whale_sign_in', { userId: user.id }).catch(() => {})
        })
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        const fromCredentials = (user as { id?: string; role?: string }).id
        if (fromCredentials) {
          token.id = user.id as string
          token.role = (user as { role?: string }).role as string
          token.assignedRoles = (user as { assignedRoles?: string[] }).assignedRoles
        } else if (account?.provider === 'google' && (user as { email?: string }).email) {
          const { prisma } = await import('@/lib/db/prisma')
          const dbUser = await prisma.user.findUnique({
            where: { email: (user as { email: string }).email },
            select: {
              id: true,
              role: true,
            },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.assignedRoles = await getActiveAssignedRoleNames(prisma, dbUser.id)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.assignedRoles = Array.isArray(token.assignedRoles)
          ? (token.assignedRoles as string[])
          : []
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours (Phase 0.3: session security)
    updateAge: 30 * 60, // 30 min inactivity refresh window
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  // NEXTAUTH_URL must match the app URL (including port). If running on 3001, set NEXTAUTH_URL=http://localhost:3001
  trustHost: true,
}
