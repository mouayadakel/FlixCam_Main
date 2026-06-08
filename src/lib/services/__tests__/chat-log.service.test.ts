/**
 * Unit tests for ChatLogService
 */

import { ChatLogService } from '../chat-log.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    chatConversation: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    chatMessage: { create: jest.fn() },
  },
}))

const mockFindFirst = prisma.chatConversation.findFirst as jest.Mock
const mockCreateConv = prisma.chatConversation.create as jest.Mock
const mockCreateMsg = prisma.chatMessage.create as jest.Mock
const mockUpdateMany = prisma.chatConversation.updateMany as jest.Mock

describe('ChatLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates conversation and appends first message', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreateConv.mockResolvedValue({ id: 'conv-1' })
    mockCreateMsg.mockResolvedValue({})

    await ChatLogService.appendMessage({
      sessionId: 'sess-1',
      channel: 'public',
      role: 'user',
      content: 'Hello',
    })

    expect(mockCreateConv).toHaveBeenCalled()
    expect(mockCreateMsg).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
        }),
      })
    )
  })

  it('skips empty content', async () => {
    await ChatLogService.appendMessage({
      sessionId: 'sess-1',
      channel: 'public',
      role: 'user',
      content: '   ',
    })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('marks handover timestamp', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })
    await ChatLogService.markHandover('sess-1', 'public')
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'sess-1', channel: 'public' },
        data: { handoverAt: expect.any(Date) },
      })
    )
  })
})
