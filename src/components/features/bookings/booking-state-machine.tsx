/**
 * @file booking-state-machine.tsx
 * @description Visual state machine component for bookings
 * @module components/features/bookings
 */

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BOOKING_STATES, getAllowedTransitions } from '@/lib/booking/state-machine'
import type { BookingState } from '@/lib/types/booking.types'
import { BookingStatus } from '@prisma/client'

interface BookingStateMachineProps {
  currentState: BookingState
  onTransition?: (toState: BookingState) => void
  userRole?: string
  loading?: boolean
}

export function BookingStateMachine({
  currentState,
  onTransition,
  userRole,
  loading = false,
}: BookingStateMachineProps) {
  const states: BookingState[] = [
    'DRAFT',
    'RISK_CHECK',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'ACTIVE',
    'RETURNED',
    'CLOSED',
    'CANCELLED',
  ]

  const allowedTransitions = getAllowedTransitions(currentState, userRole)

  const getStateIndex = (state: BookingState) => {
    return states.indexOf(state)
  }

  const currentIndex = getStateIndex(currentState)
  const isFinalState = BOOKING_STATES[currentState]?.final

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">حالة الحجز</h3>
        <Badge
          style={{
            backgroundColor: BOOKING_STATES[currentState]?.color,
            color: '#fff',
          }}
        >
          {BOOKING_STATES[currentState]?.label.ar}
        </Badge>
      </div>

      {/* State Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {states.map((state, index) => {
            const stateConfig = BOOKING_STATES[state]
            const isActive = state === currentState
            const isPast = index < currentIndex
            const isFuture = index > currentIndex
            const isAllowed = allowedTransitions.includes(state)

            return (
              <div key={state} className="flex flex-col items-center flex-1">
                {/* Connection Line */}
                {index < states.length - 1 && (
                  <div
                    className={`absolute top-5 h-0.5 w-full ${
                      isPast || isActive ? 'bg-primary-500' : 'bg-neutral-200'
                    }`}
                    style={{
                      left: `${(index * 100) / (states.length - 1)}%`,
                      width: `${100 / (states.length - 1)}%`,
                    }}
                  />
                )}

                {/* State Circle */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isActive
                      ? 'bg-primary-500 border-primary-600'
                      : isPast
                        ? 'bg-primary-100 border-primary-300'
                        : 'bg-white border-neutral-300'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: stateConfig.color,
                          borderColor: stateConfig.color,
                        }
                      : {}
                  }
                >
                  <span
                    className={`text-xs font-bold ${
                      isActive || isPast ? 'text-white' : 'text-neutral-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* State Label */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-medium ${
                      isActive ? 'text-primary-600' : 'text-neutral-500'
                    }`}
                  >
                    {stateConfig.label.ar}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Allowed Transitions */}
      {!isFinalState && allowedTransitions.length > 0 && onTransition && (
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <span className="text-sm font-medium text-neutral-700">الانتقالات المتاحة:</span>
          {allowedTransitions.map((toState) => {
            const stateConfig = BOOKING_STATES[toState]
            return (
              <Button
                key={toState}
                variant="outline"
                size="sm"
                onClick={() => onTransition(toState)}
                disabled={loading}
              >
                {stateConfig.label.ar}
              </Button>
            )
          })}
        </div>
      )}

      {isFinalState && (
        <div className="text-sm text-muted-foreground pt-2">
          هذه حالة نهائية - لا يمكن تغييرها
        </div>
      )}
    </div>
  )
}
