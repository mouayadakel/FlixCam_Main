/**
 * Author bio - author card at bottom of post.
 */

import Image from 'next/image'
import type { BlogAuthorPublic } from '@/lib/types/blog.types'

interface AuthorBioProps {
  author: BlogAuthorPublic
  locale: string
}

export function AuthorBio({ author, locale }: AuthorBioProps) {
  const bio = locale === 'ar' ? author.bioAr : author.bioEn
  if (!bio) return null

  return (
    <div className="my-12 flex gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
      {author.avatar && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
          <Image
            src={author.avatar}
            alt={author.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}
      <div>
        <p className="font-semibold text-gray-900">{author.name}</p>
        {author.role && (
          <p className="text-sm text-gray-500">{author.role}</p>
        )}
        <p className="mt-2 text-gray-600">{bio}</p>
      </div>
    </div>
  )
}
