/**
 * Equipment embed block - equipment card with link.
 * Fetches equipment from API when equipmentId is provided.
 */

import Link from 'next/link'
import Image from 'next/image'

interface EquipmentEmbedProps {
  equipmentId: string
  name?: string
  imageUrl?: string
  pricePerDay?: number
  slug?: string
  note?: string
}

export function EquipmentEmbedBlock({
  equipmentId,
  name,
  imageUrl,
  pricePerDay,
  slug,
  note,
}: EquipmentEmbedProps) {
  const href = slug ? `/equipment/${slug}` : `/equipment/${equipmentId}`
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {imageUrl && (
          <div className="relative h-40 w-full shrink-0 sm:h-32 sm:w-40">
            <Image
              src={imageUrl}
              alt={name ?? 'Equipment'}
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <Link href={href} className="font-semibold text-gray-900 hover:text-brand-primary">
              {name ?? 'Equipment'}
            </Link>
            {note && <p className="mt-1 text-sm text-gray-600">{note}</p>}
          </div>
          <div className="mt-3 flex items-center gap-4">
            {pricePerDay != null && (
              <span className="font-semibold text-brand-primary">
                {pricePerDay} SAR / day
              </span>
            )}
            <Link
              href={href}
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
