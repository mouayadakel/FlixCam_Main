/**
 * @file config.ts
 * @description NextAuth.js configuration
 * @module lib/auth
 */

import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const { prisma } = await import('@/lib/db/prisma')
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || user.deletedAt) {
          return null
        }

        if (user.status !== 'active') {
          return null
        }

        const bcrypt = await import('bcryptjs')
        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
          return null
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
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
        if (!user || user.deletedAt || user.status !== 'active') return null

        await cacheDelete('authToken', token)
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const { prisma } = await import('@/lib/db/prisma')
        const dbUser = await prisma.user.findUnique({
          where: { email: profile.email as string },
        })
        if (!dbUser || dbUser.deletedAt || dbUser.status !== 'active') {
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        const fromCredentials = (user as { id?: string; role?: string }).id
        if (fromCredentials) {
          token.id = user.id as string
          token.role = (user as { role?: string }).role as string
        } else if (account?.provider === 'google' && (user as { email?: string }).email) {
          const { prisma } = await import('@/lib/db/prisma')
          const dbUser = await prisma.user.findUnique({
            where: { email: (user as { email: string }).email },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
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
