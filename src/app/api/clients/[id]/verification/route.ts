/**
 * @file route.ts
 * @description Client verification – get status + documents, update status
 * @module app/api/clients/[id]/verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { ClientPolicy } from '@/lib/policies/client.policy'
import { updateUserVerificationSchema } from '@/lib/validators/verification.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const { id: clientId } = await params

    const policy = await ClientPolicy.canView(session.user.id, clientId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason ?? 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
        verificationDocuments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!user) throw new NotFoundError('User', clientId)

    const documents = user.verificationDocuments.map((d) => ({
      id: d.id,
      userId: d.userId,
      documentType: d.documentType,
      fileUrl: d.fileUrl,
      filename: d.filename ?? null,
      mimeType: d.mimeType ?? null,
      status: d.status,
      reviewedBy: d.reviewedBy ?? null,
      reviewedAt: d.reviewedAt?.toISOString() ?? null,
      rejectionReason: d.rejectionReason ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      verificationStatus: user.verificationStatus,
      user: { id: user.id, name: user.name, email: user.email },
      documents,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const parsed = updateUserVerificationSchema.parse(body)

    await prisma.user.update({
      where: { id: clientId },
      data: { verificationStatus: parsed.verificationStatus },
    })

    const updated = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
      },
    })

    return NextResponse.json({
      verificationStatus: updated!.verificationStatus,
      user: updated,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
