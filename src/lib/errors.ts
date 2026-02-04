/**
 * @file errors.ts
 * @description Custom error classes
 * @module lib/errors
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`, 404, 'NOT_FOUND')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class PolicyViolationError extends AppError {
  constructor(reason: string) {
    super(`Policy violation: ${reason}`, 403, 'POLICY_VIOLATION')
  }
}

export class ApprovalRequiredError extends AppError {
  constructor(action: string) {
    super(`Approval required for: ${action}`, 403, 'APPROVAL_REQUIRED')
  }
}
