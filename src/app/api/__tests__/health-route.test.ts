/**
 * Integration tests for GET /api/health
 * Public route - no auth required.
 */

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('uptime')
  })
})
