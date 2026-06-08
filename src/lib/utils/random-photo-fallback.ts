const RANDOM_PHOTO_COUNT = 292

function toPositiveHash(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getSeededRandomPhotoPath(seed: string): string {
  const safeSeed = seed.trim() || 'fallback'
  const index = (toPositiveHash(safeSeed) % RANDOM_PHOTO_COUNT) + 1
  return `/photos/random-${String(index).padStart(4, '0')}.jpg`
}
