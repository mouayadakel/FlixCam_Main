/**
 * @file route.ts
 * @description NextAuth.js API route handler
 * @module app/api/auth
 */

import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
