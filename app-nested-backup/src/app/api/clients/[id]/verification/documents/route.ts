/**
 * @file route.ts
 * @description Upload/add verification document for a client
 * @module app/api/clients/[id]/verification/documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { ClientPolicy } from '@/lib/policies/client.policy'
import { createVerificationDocumentSchema } from '@/lib/validators/verification.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const { id: clientId } = await params

    const policy = await ClientPolicy.canUpdate(session.user.id, clientId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason ?? 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: clientId } })
    if (!user) throw new NotFoundError('User', clientId)

    const body = await request.json()
    const parsed = createVerificationDocumentSchema.parse({
      ...body,
      userId: clientId,
    })

    const doc = await prisma.verificationDocument.create({
      data: {
        userId: parsed.userId,
        documentType: parsed.documentType,
        fileUrl: parsed.fileUrl,
        filename: parsed.filename ?? null,
        mimeType: parsed.mimeType ?? null,
      },
    })

    await prisma.user.update({
      where: { id: clientId },
      data: { verificationStatus: 'PENDING' },
    })

    return NextResponse.json({
      document: {
        id: doc.id,
        userId: doc.userId,
        documentType: doc.documentType,
        fileUrl: doc.fileUrl,
        filename: doc.filename ?? null,
        mimeType: doc.mimeType ?? null,
        status: doc.status,
        reviewedBy: doc.reviewedBy ?? null,
        reviewedAt: doc.reviewedAt?.toISOString() ?? null,
        rejectionReason: doc.rejectionReason ?? null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
