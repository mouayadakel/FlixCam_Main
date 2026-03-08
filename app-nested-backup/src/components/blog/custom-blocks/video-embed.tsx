/**
 * Video embed block - YouTube/Vimeo responsive iframe.
 */

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const vid = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v')
      return vid ? `https://www.youtube.com/embed/${vid}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const vid = u.pathname.split('/').filter(Boolean).pop()
      return vid ? `https://player.vimeo.com/video/${vid}` : null
    }
  } catch {
    return null
  }
  return null
}

interface VideoEmbedProps {
  url: string
  caption?: string
}

export function VideoEmbedBlock({ url, caption }: VideoEmbedProps) {
  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) return null
  return (
    <figure className="my-8">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={embedUrl}
          title="Video embed"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">{caption}</figcaption>
      )}
    </figure>
  )
}
