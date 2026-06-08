'use client'

import type { ReactNode } from 'react'

interface CheckoutPaymentMethodOptionProps {
  id: string
  label: string
  helper: string
  checked: boolean
  onChange: () => void
  logos?: Array<{ src: string; alt: string }>
  children?: ReactNode
}

export function CheckoutPaymentMethodOption({
  id,
  label,
  helper,
  checked,
  onChange,
  logos,
  children,
}: CheckoutPaymentMethodOptionProps) {
  return (
    <div>
      <label
        className={`block rounded-xl border bg-white p-4 transition-all ${
          checked
            ? 'border-[#5A31F4] bg-[#F3F0FF] shadow-[0_0_0_1px_rgba(90,49,244,0.2)]'
            : 'border-[#E5E7EB] hover:border-[#cfc4ff]'
        }`}
      >
        <div className="flex cursor-pointer items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              id={id}
              type="radio"
              name="payment-option"
              className="h-4 w-4 accent-[#5A31F4]"
              checked={checked}
              onChange={onChange}
            />
            <span className="font-medium text-[#111827]">{label}</span>
          </div>
          <span className="text-xs text-[#6B7280]">{helper}</span>
        </div>
        {logos && logos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {logos.map((logo) => (
              <img
                key={`${id}-${logo.src}`}
                src={logo.src}
                alt={logo.alt}
                className="h-7 w-auto rounded-md border border-[#E5E7EB] bg-white px-1.5 py-1"
              />
            ))}
          </div>
        )}
      </label>
      {checked && children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
