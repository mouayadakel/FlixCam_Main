/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/errors.ts
 * FEATURE: Error handling
 * UNITS: AppError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError, PolicyViolationError, ApprovalRequiredError
 * ═══════════════════════════════════════════════════════
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  PolicyViolationError,
  ApprovalRequiredError,
} from '@/lib/errors'

// ─────────────────────────────────────
// UNIT: AppError
// REQUIREMENTS:
//   - Extends Error; sets name to constructor name, captures stack.
//   - Accepts message (string), statusCode (number, default 500), code (optional string).
//   - statusCode and code are readable as public properties.
// ─────────────────────────────────────

describe('AppError', () => {
  describe('successful creation', () => {
    it('creates an error with message and default statusCode 500 when only message is provided', () => {
      // Arrange
      const message = 'Something went wrong'

      // Act
      const error = new AppError(message)

      // Assert
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(500)
      expect(error.code).toBeUndefined()
      expect(error.name).toBe('AppError')
      expect(typeof error.stack).toBe('string')
    })

    it('creates an error with custom statusCode when provided', () => {
      // Arrange
      const message = 'Bad request'
      const statusCode = 400

      // Act
      const error = new AppError(message, statusCode)

      // Assert
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(400)
      expect(error.code).toBeUndefined()
    })

    it('creates an error with message, statusCode, and code when all are provided', () => {
      // Arrange
      const message = 'Conflict'
      const statusCode = 409
      const code = 'CONFLICT'

      // Act
      const error = new AppError(message, statusCode, code)

      // Assert
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
    })
  })

  describe('edge cases', () => {
    it('accepts empty string message', () => {
      // Arrange & Act
      const error = new AppError('', 500)

      // Assert
      expect(error.message).toBe('')
      expect(error.statusCode).toBe(500)
    })

    it('accepts statusCode 0', () => {
      // Arrange & Act
      const error = new AppError('Message', 0)

      // Assert
      expect(error.statusCode).toBe(0)
    })
  })
})

// ─────────────────────────────────────
// UNIT: ValidationError
// REQUIREMENTS:
//   - Extends AppError; statusCode 400, code 'VALIDATION_ERROR'.
//   - Optional fields (Record<string, string[]>) for field-level errors.
// ─────────────────────────────────────

describe('ValidationError', () => {
  describe('successful creation', () => {
    it('creates a validation error with message and default status 400 and code VALIDATION_ERROR', () => {
      // Arrange
      const message = 'Invalid input'

      // Act
      const error = new ValidationError(message)

      // Assert
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.fields).toBeUndefined()
      expect(error.name).toBe('ValidationError')
    })

    it('creates a validation error with message and fields when both are provided', () => {
      // Arrange
      const message = 'Validation failed'
      const fields = { email: ['Invalid email'], name: ['Required'] }

      // Act
      const error = new ValidationError(message, fields)

      // Assert
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.fields).toEqual({ email: ['Invalid email'], name: ['Required'] })
    })
  })

  describe('edge cases', () => {
    it('accepts empty fields object', () => {
      // Arrange & Act
      const error = new ValidationError('Error', {})

      // Assert
      expect(error.fields).toEqual({})
    })
  })
})

// ─────────────────────────────────────
// UNIT: NotFoundError
// REQUIREMENTS:
//   - Extends AppError; statusCode 404, code 'NOT_FOUND'.
//   - Message format: "{resource} not found" or "{resource} with id {id} not found" when id provided.
// ─────────────────────────────────────

describe('NotFoundError', () => {
  describe('successful creation', () => {
    it('creates a not found error with resource only when id is not provided', () => {
      // Arrange
      const resource = 'User'

      // Act
      const error = new NotFoundError(resource)

      // Assert
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.name).toBe('NotFoundError')
    })

    it('creates a not found error with resource and id when both are provided', () => {
      // Arrange
      const resource = 'Booking'
      const id = 'bk_123'

      // Act
      const error = new NotFoundError(resource, id)

      // Assert
      expect(error.message).toBe('Booking with id bk_123 not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })
  })

  describe('edge cases', () => {
    it('accepts empty string resource', () => {
      // Arrange & Act
      const error = new NotFoundError('')

      // Assert
      expect(error.message).toBe(' not found')
    })

    it('produces resource-only message when id is empty string because empty string is falsy', () => {
      // Arrange & Act — code uses `id ?`, so '' is falsy
      const error = new NotFoundError('User', '')

      // Assert
      expect(error.message).toBe('User not found')
    })
  })
})

// ─────────────────────────────────────
// UNIT: ForbiddenError
// REQUIREMENTS:
//   - Extends AppError; statusCode 403, code 'FORBIDDEN'.
//   - Default message 'Forbidden' when not provided.
// ─────────────────────────────────────

describe('ForbiddenError', () => {
  describe('successful creation', () => {
    it('creates a forbidden error with default message when no message is provided', () => {
      // Act
      const error = new ForbiddenError()

      // Assert
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.message).toBe('Forbidden')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.name).toBe('ForbiddenError')
    })

    it('creates a forbidden error with custom message when provided', () => {
      // Arrange
      const message = 'You do not have access to this resource'

      // Act
      const error = new ForbiddenError(message)

      // Assert
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
    })
  })
})

// ─────────────────────────────────────
// UNIT: UnauthorizedError
// REQUIREMENTS:
//   - Extends AppError; statusCode 401, code 'UNAUTHORIZED'.
//   - Default message 'Unauthorized' when not provided.
// ─────────────────────────────────────

describe('UnauthorizedError', () => {
  describe('successful creation', () => {
    it('creates an unauthorized error with default message when no message is provided', () => {
      // Act
      const error = new UnauthorizedError()

      // Assert
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(UnauthorizedError)
      expect(error.message).toBe('Unauthorized')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.name).toBe('UnauthorizedError')
    })

    it('creates an unauthorized error with custom message when provided', () => {
      // Arrange
      const message = 'Session expired'

      // Act
      const error = new UnauthorizedError(message)

      // Assert
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })
  })
})

// ─────────────────────────────────────
// UNIT: PolicyViolationError
// REQUIREMENTS:
//   - Extends AppError; statusCode 403, code 'POLICY_VIOLATION'.
//   - Message format: "Policy violation: {reason}".
// ─────────────────────────────────────

describe('PolicyViolationError', () => {
  describe('successful creation', () => {
    it('creates a policy violation error with reason in message', () => {
      // Arrange
      const reason = 'Cannot delete confirmed booking'

      // Act
      const error = new PolicyViolationError(reason)

      // Assert
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(PolicyViolationError)
      expect(error.message).toBe('Policy violation: Cannot delete confirmed booking')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('POLICY_VIOLATION')
      expect(error.name).toBe('PolicyViolationError')
    })
  })

  describe('edge cases', () => {
    it('accepts empty string reason', () => {
      // Arrange & Act
      const error = new PolicyViolationError('')

      // Assert
      expect(error.message).toBe('Policy violation: ')
    })
  })
})

// ─────────────────────────────────────
// UNIT: ApprovalRequiredError
// REQUIREMENTS:
//   - Extends AppError; statusCode 403, code 'APPROVAL_REQUIRED'.
//   - Message format: "Approval required for: {action}".
// ─────────────────────────────────────

describe('ApprovalRequiredError', () => {
  describe('successful creation', () => {
    it('creates an approval required error with action in message', () => {
      // Arrange
      const action = 'payment.refund'

      // Act
      const error = new ApprovalRequiredError(action)

      // Assert
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(ApprovalRequiredError)
      expect(error.message).toBe('Approval required for: payment.refund')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('APPROVAL_REQUIRED')
      expect(error.name).toBe('ApprovalRequiredError')
    })
  })

  describe('edge cases', () => {
    it('accepts empty string action', () => {
      // Arrange & Act
      const error = new ApprovalRequiredError('')

      // Assert
      expect(error.message).toBe('Approval required for: ')
    })
  })
})
