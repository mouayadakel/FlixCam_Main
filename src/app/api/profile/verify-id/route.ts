/**
 * @file route.ts
 * @description Customer endpoint to submit ID for verification
 * @module app/api/profile/verify-id
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { logger } from '@/lib/logger'

const documentTypeEnum = z.enum([
  'NATIONAL_ID',
  'PASSPORT',
  'DRIVING_LICENSE',
  'IQAMA',
])

const verifyIdSubmitSchema = z.object({
  documentType: documentTypeEnum,
  documentNumber: z.string().min(1, 'Document number is required'),
  documentUrl: z.string().url('Valid document URL is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = verifyIdSubmitSchema.parse(body)

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        idDocumentType: parsed.documentType,
        idDocumentNumber: parsed.documentNumber,
        idDocumentUrl: parsed.documentUrl,
        idVerificationStatus: 'PENDING_REVIEW',
        idRejectionReason: null,
      },
    })

    logger.info('ID verification submitted', {
      userId: session.user.id,
      documentType: parsed.documentType,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
