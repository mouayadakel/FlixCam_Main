'use client'

interface UploadMediaInput {
  file: File
  equipmentId?: string
  studioId?: string
  inspectionId?: string
  cmsFolder?: string
  /**
   * Max encoded size to send (client may compress raster images down to this).
   * Defaults to 9MB to stay under the generic 10MB server limit.
   * Use ~28MB with CMS hero uploads when the server allows 30MB for `uploadImageForCms`.
   */
  compressTargetBytes?: number
}

interface UploadMediaResponse {
  id: string
  url: string
}

const DEFAULT_COMPRESS_TARGET_BYTES = 9 * 1024 * 1024 // Keep under generic 10MB server limit
const MIN_QUALITY = 0.45
const START_QUALITY = 0.9
const RESIZE_RATIO = 0.85

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode image for upload'))
    img.src = dataUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode image for upload'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })
}

async function compressImageForUpload(
  file: File,
  targetMaxBytes: number = DEFAULT_COMPRESS_TARGET_BYTES
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }
  if (file.size <= targetMaxBytes) {
    return file
  }

  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImageFromDataUrl(dataUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to initialize image compressor')
  }

  let width = img.naturalWidth
  let height = img.naturalHeight
  let quality = START_QUALITY
  const maxMb = Math.max(1, Math.round(targetMaxBytes / (1024 * 1024)))

  while (true) {
    canvas.width = Math.max(1, Math.round(width))
    canvas.height = Math.max(1, Math.round(height))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = await canvasToBlob(canvas, quality)
    if (blob.size <= targetMaxBytes) {
      const safeName = file.name.replace(/\.[^.]+$/, '') || 'upload'
      return new File([blob], `${safeName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })
    }

    const canLowerQuality = quality > MIN_QUALITY
    if (canLowerQuality) {
      quality = Math.max(MIN_QUALITY, quality - 0.1)
      continue
    }

    width = Math.floor(width * RESIZE_RATIO)
    height = Math.floor(height * RESIZE_RATIO)
    if (width < 800 || height < 800) {
      throw new Error(`تعذر ضغط الصورة ضمن حد ${maxMb} م.ب. جرّب صورة أصغر حجماً أو دقة أقل.`)
    }
  }
}

async function parseUploadError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error || 'Upload failed'
  } catch {
    return 'Upload failed'
  }
}

export async function uploadMediaFile({
  file,
  equipmentId,
  studioId,
  inspectionId,
  cmsFolder,
  compressTargetBytes = DEFAULT_COMPRESS_TARGET_BYTES,
}: UploadMediaInput): Promise<UploadMediaResponse> {
  const optimizedFile = await compressImageForUpload(file, compressTargetBytes)
  const formData = new FormData()
  formData.append('file', optimizedFile)
  if (equipmentId) formData.append('equipmentId', equipmentId)
  if (studioId) formData.append('studioId', studioId)
  if (inspectionId) formData.append('inspectionId', inspectionId)
  if (cmsFolder) formData.append('cmsFolder', cmsFolder)

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await parseUploadError(response))
  }

  return (await response.json()) as UploadMediaResponse
}
