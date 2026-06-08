'use client'

interface CheckoutProgressHeaderProps {
  onCancelHref?: string
}

const STEPS = [
  { id: 1, label: 'Personal details', status: 'completed' },
  { id: 2, label: 'Payment', status: 'active' },
  { id: 3, label: 'Complete', status: 'pending' },
] as const

export function CheckoutProgressHeader({ onCancelHref = '/cart' }: CheckoutProgressHeaderProps) {
  return (
    <header className="rounded-xl border border-[#E5E7EB] bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-lg font-bold text-[#111827]">FlixCam Checkout</div>
        <a href={onCancelHref} className="text-sm font-medium text-rose-500 hover:text-rose-600">
          Cancel Booking
        </a>
      </div>
      <ol className="mt-6 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step.status === 'active'
                  ? 'bg-[#5A31F4] text-white'
                  : step.status === 'completed'
                    ? 'bg-[#ede9fe] text-[#5A31F4]'
                    : 'bg-[#f3f4f6] text-[#6B7280]'
              }`}
            >
              {step.id}
            </span>
            <span
              className={`whitespace-nowrap text-sm ${
                step.status === 'active' ? 'font-semibold text-[#111827]' : 'text-[#6B7280]'
              }`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-[#D1D5DB] sm:w-14" />}
          </li>
        ))}
      </ol>
    </header>
  )
}
