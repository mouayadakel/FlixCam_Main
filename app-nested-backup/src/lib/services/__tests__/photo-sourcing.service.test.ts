/**
 * Unit tests for photo-sourcing.service
 */
import { sourceImages, validateImageRelevance } from '../photo-sourcing.service'

jest.mock('../image-sourcing.service', () => ({
  sourceImages: jest.fn().mockResolvedValue([]),
  validateImageRelevance: jest.fn().mockResolvedValue({ score: 0.9, description: 'Relevant' }),
}))

const product = {
  id: 'p1',
  name: 'Camera',
  sku: 'SKU-1',
  translations: [{ locale: 'en', name: 'Camera', longDescription: 'A camera' }],
}

describe('photo-sourcing.service', () => {
  it('sourceImages delegates to image-sourcing and returns array', async () => {
    const result = await sourceImages(product, 4)
    expect(Array.isArray(result)).toBe(true)
    const { sourceImages: mockSource } = require('../image-sourcing.service')
    expect(mockSource).toHaveBeenCalledWith(product, 4)
  })

  it('validateImageRelevance delegates and returns score', async () => {
    const result = await validateImageRelevance('https://ex.com/img.jpg', product)
    expect(result).toEqual({ score: 0.9, description: 'Relevant' })
  })
})
