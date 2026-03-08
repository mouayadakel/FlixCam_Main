/**
 * Gallery block - responsive image grid.
 */

import Image from 'next/image'

interface GalleryImage {
  src: string
  alt?: string
  caption?: string
}

interface GalleryBlockProps {
  images: GalleryImage[]
  columns?: 2 | 3 | 4
}

export function GalleryBlock({ images, columns = 3 }: GalleryBlockProps) {
  const gridClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return (
    <figure className="my-8">
      <div className={`grid gap-4 ${gridClass}`}>
        {images.map((img, i) => (
          <div key={i} className="overflow-hidden rounded-lg">
            <div className="relative aspect-video">
              <Image
                src={img.src}
                alt={img.alt ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            {img.caption && (
              <figcaption className="mt-2 text-center text-sm text-gray-500">
                {img.caption}
              </figcaption>
            )}
          </div>
        ))}
      </div>
    </figure>
  )
}
