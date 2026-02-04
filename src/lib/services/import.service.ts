import { prisma } from '@/lib/db/prisma'
import { ImportJobStatus, ImportRowStatus } from '@prisma/client'
import { ValidationError } from '@/lib/errors'

export type ImportJobCreate = {
  filename: string
  mimeType: string
  createdBy?: string
}

export class ImportService {
  static async createJob(input: ImportJobCreate) {
    if (!input.filename) throw new ValidationError('filename is required')
    const job = await prisma.importJob.create({
      data: {
        filename: input.filename,
        mimeType: input.mimeType,
        status: ImportJobStatus.PENDING,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      },
    })
    return job
  }

  static async getJob(id: string) {
    const job = await prisma.importJob.findUnique({
      where: { id },
      include: {
        rows: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    })
    return job
  }

  static async markProcessing(jobId: string) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.PROCESSING },
    })
  }

  static async appendRows(jobId: string, rows: Array<{ rowNumber: number; payload: any }>) {
    if (!rows.length) return
    await prisma.importJobRow.createMany({
      data: rows.map((r) => ({
        jobId,
        rowNumber: r.rowNumber,
        payload: r.payload,
      })),
    })
    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows: { increment: rows.length } },
    })
  }

  static async markRow(jobId: string, rowNumber: number, status: ImportRowStatus, opts?: { error?: string; productId?: string }) {
    await prisma.importJobRow.updateMany({
      where: { jobId, rowNumber },
      data: {
        status,
        error: opts?.error,
        productId: opts?.productId,
      },
    })
  }

  static async bumpProgress(jobId: string, deltaProcessed: number, deltaSuccess: number, deltaError: number) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        processedRows: { increment: deltaProcessed },
        successRows: { increment: deltaSuccess },
        errorRows: { increment: deltaError },
      },
    })
  }

  static async markComplete(jobId: string) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.COMPLETED },
    })
  }

  static async markFailed(jobId: string, errorMessage: string) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.FAILED, errorMessage },
    })
  }
}
