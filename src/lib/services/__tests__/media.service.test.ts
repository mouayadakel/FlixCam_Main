/**
 * Unit tests for media.service
 */
import { MediaService } from '../media.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({ prisma: { media: { create: jest.fn() } } }))
jest.mock('fs/promises', () => ({ writeFile: jest.fn(), mkdir: jest.fn() }))
jest.mock('fs', () => ({ existsSync: jest.fn().mockReturnValue(true) }))

const mockCreate = prisma.media.create as jest.Mock

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'media-1', url: '/uploads/eq/1.jpg', type: 'image' })
  })
  it('uploadImage throws when file size exceeds max', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024)
    await expect(
      MediaService.uploadImage(
        { buffer: big, filename: 'x.jpg', mimetype: 'image/jpeg', size: 11 * 1024 * 1024 },
        'eq-1',
        'u1'
      )
    ).rejects.toThrow(/File size exceeds/)
  })
  it('uploadImage throws when mime not allowed', async () => {
    await expect(
      MediaService.uploadImage(
        { buffer: Buffer.from('x'), filename: 'x.pdf', mimetype: 'application/pdf', size: 1 },
        'eq-1',
        'u1'
      )
    ).rejects.toThrow(/not allowed/)
  })
  it('createMediaFromUrl creates record', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'm2', url: 'https://ex.com/img.jpg' })
    const result = await MediaService.createMediaFromUrl(
      { url: 'https://ex.com/img.jpg', type: 'image', filename: 'img.jpg', mimeType: 'image/jpeg' },
      'u1'
    )
    expect(mockCreate).toHaveBeenCalled()
    expect(result.id).toBe('m2')
  })
})
