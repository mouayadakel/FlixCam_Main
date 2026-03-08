import { NextRequest, NextResponse } from 'next/server'
import { POST as parentPOST } from '../route'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    return await parentPOST(request)
  } catch (error) {
    return handleApiError(error)
  }
}
