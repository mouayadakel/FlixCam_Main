/**
 * @file route.ts
 * @description Review a single verification document (approve/reject)
 * @module app/api/verification-documents/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { reviewDocumentSchema } from '@/lib/validators/verification.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const { id } = await params

    const doc = await prisma.verificationDocument.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!doc) throw new NotFoundError('Verification document', id)

    const body = await request.json()
    const parsed = reviewDocumentSchema.parse(body)

    const updated = await prisma.verificationDocument.update({
      where: { id },
      data: {
        status: parsed.status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: parsed.rejectionReason ?? null,
      },
    })

    if (parsed.status === 'approved') {
      const allDocs = await prisma.verificationDocument.findMany({
        where: { userId: doc.userId },
      })
      const allApproved = allDocs.every((d) =>
        d.id === id ? updated.status === 'approved' : d.status === 'approved'
      )
      if (allApproved) {
        await prisma.user.update({
          where: { id: doc.userId },
          data: { verificationStatus: 'VERIFIED' },
        })
      }
    } else if (parsed.status === 'rejected') {
      await prisma.user.update({
        where: { id: doc.userId },
        data: { verificationStatus: 'REJECTED' },
      })
    }

    return NextResponse.json({
      document: {
        id: updated.id,
        userId: updated.userId,
        documentType: updated.documentType,
        fileUrl: updated.fileUrl,
        filename: updated.filename ?? null,
        mimeType: updated.mimeType ?? null,
        status: updated.status,
        reviewedBy: updated.reviewedBy ?? null,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
        rejectionReason: updated.rejectionReason ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
