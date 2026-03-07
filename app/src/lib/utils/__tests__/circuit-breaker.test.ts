/**
 * Unit tests for circuit-breaker
 */

import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker'

describe('CircuitBreaker', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleSpy.mockRestore()
  })

  describe('CircuitOpenError', () => {
    it('creates error with provider name', () => {
      const err = new CircuitOpenError('openai')
      expect(err.provider).toBe('openai')
      expect(err.message).toContain('openai')
      expect(err.name).toBe('CircuitOpenError')
    })
    it('accepts custom message', () => {
      const err = new CircuitOpenError('gemini', 'Custom message')
      expect(err.message).toBe('Custom message')
    })
  })

  describe('CircuitBreaker', () => {
    it('starts in closed state', () => {
      const cb = new CircuitBreaker({ name: 'test' })
      expect(cb.getState()).toBe('closed')
    })

    it('transitions to open after maxFailures', () => {
      const cb = new CircuitBreaker({
        name: 'test',
        maxFailures: 3,
        resetTimeoutMs: 10000,
        windowMs: 60000,
      })
      cb.recordFailure()
      cb.recordFailure()
      expect(cb.getState()).toBe('closed')
      cb.recordFailure()
      expect(cb.getState()).toBe('open')
    })

    it('reset returns to closed state', () => {
      const cb = new CircuitBreaker({
        name: 'test',
        maxFailures: 2,
      })
      cb.recordFailure()
      cb.recordFailure()
      expect(cb.getState()).toBe('open')
      cb.reset()
      expect(cb.getState()).toBe('closed')
    })

    it('recordSuccess transitions half_open to closed', () => {
      jest.useFakeTimers()
      const cb = new CircuitBreaker({
        name: 'test',
        maxFailures: 2,
        resetTimeoutMs: 5000,
      })
      cb.recordFailure()
      cb.recordFailure()
      expect(cb.getState()).toBe('open')
      jest.advanceTimersByTime(6000)
      expect(cb.getState()).toBe('half_open')
      cb.recordSuccess()
      expect(cb.getState()).toBe('closed')
      jest.useRealTimers()
    })

    it('execute throws CircuitOpenError when open', async () => {
      const cb = new CircuitBreaker({
        name: 'test',
        maxFailures: 2,
      })
      cb.recordFailure()
      cb.recordFailure()
      expect(cb.getState()).toBe('open')
      await expect(cb.execute(() => Promise.resolve())).rejects.toThrow(CircuitOpenError)
    })

    it('execute returns result when closed', async () => {
      const cb = new CircuitBreaker({ name: 'test' })
      const result = await cb.execute(() => Promise.resolve(42))
      expect(result).toBe(42)
    })

    it('execute records failure on thrown error', async () => {
      const cb = new CircuitBreaker({
        name: 'test',
        maxFailures: 2,
      })
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
      cb.recordFailure()
      cb.recordFailure()
      expect(cb.getState()).toBe('open')
    })
  })
})
