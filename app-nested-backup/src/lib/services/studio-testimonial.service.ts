import { prisma } from '@/lib/db/prisma'

export class StudioTestimonialService {
  static async list(studioId: string) {
    return prisma.studioTestimonial.findMany({
      where: { studioId, deletedAt: null },
      orderBy: { order: 'asc' },
    })
  }

  static async create(
    studioId: string,
    data: {
      name: string
      role?: string
      text: string
      rating?: number
      avatarUrl?: string
      order?: number
      isActive?: boolean
    },
    userId: string
  ) {
    return prisma.studioTestimonial.create({
      data: {
        studioId,
        name: data.name,
        role: data.role,
        text: data.text,
        rating: data.rating ?? 5,
        avatarUrl: data.avatarUrl,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    })
  }

  static async update(
    id: string,
    data: {
      name?: string
      role?: string | null
      text?: string
      rating?: number
      avatarUrl?: string | null
      order?: number
      isActive?: boolean
    },
    userId: string
  ) {
    return prisma.studioTestimonial.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.text !== undefined && { text: data.text }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: userId,
      },
    })
  }

  static async delete(id: string, userId: string) {
    return prisma.studioTestimonial.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })
  }

  static async reorder(ids: string[], userId: string) {
    const updates = ids.map((id, index) =>
      prisma.studioTestimonial.update({
        where: { id },
        data: { order: index, updatedBy: userId },
      })
    )
    return prisma.$transaction(updates)
  }
}
