/**
 * @file index.ts
 * @description Auth module exports
 * @module lib/auth
 */

import NextAuth from 'next-auth'
import { authConfig } from './config'

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
