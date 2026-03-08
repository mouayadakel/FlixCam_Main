/**
 * Circuit breaker for AI provider calls.
 * Prevents cascading failures: after maxFailures, stops calling until resetTimeout elapses.
 * States: closed (normal) -> open (reject immediately) -> half_open (one trial).
 */

export class CircuitOpenError extends Error {
  constructor(
    public readonly provider: string,
    message?: string
  ) {
    super(message ?? `Circuit open for provider: ${provider}`)
    this.name = 'CircuitOpenError'
  }
}

type CircuitState = 'closed' | 'open' | 'half_open'

const DEFAULT_MAX_FAILURES = 3
const DEFAULT_RESET_TIMEOUT_MS = 5 * 60 * 1000 // 5 min
const DEFAULT_WINDOW_MS = 60 * 1000 // 1 min

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailureTime = 0
  private readonly maxFailures: number
  private readonly resetTimeoutMs: number
  private readonly windowMs: number
  private readonly name: string

  constructor(options: {
    name: string
    maxFailures?: number
    resetTimeoutMs?: number
    windowMs?: number
  }) {
    this.name = options.name
    this.maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES
    this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  }

  getState(): CircuitState {
    const now = Date.now()
    if (this.state === 'open' && now - this.lastFailureTime >= this.resetTimeoutMs) {
      this.state = 'half_open'
      this.failures = 0
      console.log(`[CircuitBreaker:${this.name}] open -> half_open`)
    }
    return this.state
  }

  recordSuccess(): void {
    if (this.state === 'half_open') {
      this.state = 'closed'
      this.failures = 0
      console.log(`[CircuitBreaker:${this.name}] half_open -> closed (success)`)
    }
  }

  recordFailure(): void {
    const now = Date.now()
    if (now - this.lastFailureTime > this.windowMs) {
      this.failures = 0
    }
    this.lastFailureTime = now
    this.failures += 1
    if (this.failures >= this.maxFailures) {
      this.state = 'open'
      console.log(`[CircuitBreaker:${this.name}] closed -> open (failures=${this.failures})`)
    }
  }

  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
    console.log(`[CircuitBreaker:${this.name}] reset -> closed`)
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState()
    if (state === 'open') {
      throw new CircuitOpenError(this.name, `Circuit open for ${this.name}`)
    }
    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (err) {
      this.recordFailure()
      throw err
    }
  }
}

const geminiBreaker = new CircuitBreaker({
  name: 'gemini',
  maxFailures: 3,
  resetTimeoutMs: 5 * 60 * 1000,
})
const openaiBreaker = new CircuitBreaker({
  name: 'openai',
  maxFailures: 3,
  resetTimeoutMs: 5 * 60 * 1000,
})
const dalleBreaker = new CircuitBreaker({
  name: 'dalle',
  maxFailures: 3,
  resetTimeoutMs: 5 * 60 * 1000,
})

export { geminiBreaker, openaiBreaker, dalleBreaker }
