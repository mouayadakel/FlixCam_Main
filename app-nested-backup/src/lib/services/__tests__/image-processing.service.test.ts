/**
 * Unit tests for image-processing.service
 */
import {
  uploadBufferToCloudinary,
  processImageFromUrl,
  deleteImage,
} from '../image-processing.service'

const mockUploadStream = jest.fn()
const mockDestroy = jest.fn()
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((_opts: unknown, cb: (err: Error | null, result: unknown) => void) => {
        mockUploadStream(_opts, cb)
        return { end: jest.fn() }
      }),
      destroy: jest.fn((publicId: string) => mockDestroy(publicId)),
    },
  },
}))

describe('image-processing.service', () => {
  const originalEnv = process.env
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })
  afterAll(() => {
    process.env = originalEnv
  })

  describe('processImageFromUrl', () => {
    it('returns placeholder for invalid URL', async () => {
      const result = await processImageFromUrl('http://localhost/image.jpg')
      expect(result.success).toBe(false)
      expect(result.url).toBe('/images/placeholder.jpg')
      expect(result.error).toBe('Invalid or unsafe URL')
    })
    it('returns original URL when Cloudinary not configured', async () => {
      process.env.CLOUDINARY_API_KEY = ''
      process.env.CLOUDINARY_CLOUD_NAME = ''
      const result = await processImageFromUrl('https://images.unsplash.com/photo.jpg')
      expect(result.url).toBe('https://images.unsplash.com/photo.jpg')
      expect(result.success).toBe(true)
    })
  })

  describe('uploadBufferToCloudinary', () => {
    it('resolves when upload succeeds', async () => {
      const mockResult = {
        secure_url: 'https://res.cloudinary.com/xxx/image.jpg',
        public_id: 'products/abc',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 1024,
      }
      mockUploadStream.mockImplementation((_o: unknown, cb: (e: null, r: unknown) => void) => {
        setImmediate(() => cb(null, mockResult))
      })
      const result = await uploadBufferToCloudinary(Buffer.from('x'), 'products')
      expect(result.url).toBe(mockResult.secure_url)
      expect(result.success).toBe(true)
    })
    it('rejects when upload fails', async () => {
      mockUploadStream.mockImplementation((_o: unknown, cb: (e: Error, r: null) => void) => {
        setImmediate(() => cb(new Error('Upload failed'), null))
      })
      await expect(uploadBufferToCloudinary(Buffer.from('x'), 'products')).rejects.toThrow('Upload failed')
    })
  })

  describe('deleteImage', () => {
    it('calls cloudinary destroy', async () => {
      mockDestroy.mockResolvedValue(undefined)
      await deleteImage('products/abc')
      expect(mockDestroy).toHaveBeenCalledWith('products/abc')
    })
  })
})
