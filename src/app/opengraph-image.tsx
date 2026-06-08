import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'FlixCam.rent'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a2e0a 50%, #8CC63F 100%)',
        color: '#fff',
        fontSize: 56,
        fontWeight: 700,
        padding: 48,
      }}
    >
      <span>FlixCam.rent</span>
      <span style={{ fontSize: 28, marginTop: 16, opacity: 0.9 }}>
        Cinematic Equipment & Studio Rental — Riyadh
      </span>
    </div>,
    { ...size }
  )
}
