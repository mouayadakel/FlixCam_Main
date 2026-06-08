/**
 * Unit tests for media-upload-validation
 */

import { validateMediaUpload, MEDIA_UPLOAD_MAX_BYTES } from '../media-upload-validation'

describe('media-upload-validation', () => {
  it('accepts jpeg under size limit', () => {
    expect(() =>
      validateMediaUpload({
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      })
    ).not.toThrow()
  })

  it('rejects executable extensions', () => {
    expect(() =>
      validateMediaUpload({
        filename: 'malware.exe',
        mimetype: 'image/jpeg',
        size: 100,
      })
    ).toThrow(/not allowed/)
  })

  it('rejects oversize files', () => {
    expect(() =>
      validateMediaUpload({
        filename: 'big.png',
        mimetype: 'image/png',
        size: MEDIA_UPLOAD_MAX_BYTES + 1,
      })
    ).toThrow(/exceeds/)
  })
})
