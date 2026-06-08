'use client'

import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { MetaPixel } from '@/components/analytics/meta-pixel'
import {
  TikTokPixel,
  SnapchatPixel,
  PinterestTag,
  MicrosoftClarity,
  TwitterXPixel,
} from '@/components/analytics/all-pixels'
import type { PublicMarketingTrackingConfig } from '@/lib/services/marketing-settings.service'

interface PublicTrackingScriptsProps extends PublicMarketingTrackingConfig {
  children?: React.ReactNode
}

/**
 * GTM loads in root layout (document head). When gtmId is set (env/DB/default), skip direct
 * third-party tags so the container owns them; otherwise inject pixels/GA here.
 */
export function PublicTrackingScripts({
  gtmId,
  ga4Id,
  metaPixelId,
  tiktokPixelId,
  snapchatPixelId,
  pinterestTagId,
  twitterPixelId,
  clarityId,
  children,
}: PublicTrackingScriptsProps) {
  const useGtm = Boolean(gtmId)

  return (
    <>
      {useGtm ? null : (
        <>
          <GoogleAnalytics gaId={ga4Id} />
          {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
          {tiktokPixelId ? <TikTokPixel id={tiktokPixelId} /> : null}
          {snapchatPixelId ? <SnapchatPixel id={snapchatPixelId} /> : null}
          {pinterestTagId ? <PinterestTag id={pinterestTagId} /> : null}
          {twitterPixelId ? <TwitterXPixel id={twitterPixelId} /> : null}
          {clarityId ? <MicrosoftClarity id={clarityId} /> : null}
        </>
      )}
      {useGtm && clarityId ? <MicrosoftClarity id={clarityId} /> : null}
      {children}
    </>
  )
}
