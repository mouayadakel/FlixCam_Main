/**
 * @file route.ts
 * @description NextAuth.js API route handler
 * @module app/api/auth
 */

import { handlers } from '@/lib/auth'
import { NextResponse } from 'next/server'

function withJsonErrorHandler(
  handler: (req: Request, ...args: unknown[]) => Promise<Response>
): (req: Request, ...args: unknown[]) => Promise<Response> {
  return async (req: Request, ...args: unknown[]) => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      console.error('[Auth] Route error:', error)
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

export const GET = withJsonErrorHandler(
  handlers.GET as (req: Request, ...args: unknown[]) => Promise<Response>
)
export const POST = withJsonErrorHandler(
  handlers.POST as (req: Request, ...args: unknown[]) => Promise<Response>
)
