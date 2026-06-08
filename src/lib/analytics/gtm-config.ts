/**
 * Site-wide Google Tag Manager: env wins; otherwise the production container.
 */
export const SITE_GTM_DEFAULT_CONTAINER_ID = 'GTM-PBKZKV8F'

export function rootLayoutGtmContainerId(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || process.env.GTM_CONTAINER_ID || '').trim()
  return fromEnv || SITE_GTM_DEFAULT_CONTAINER_ID
}

/**
 * Google Tag Manager — paste from Google Tag Manager UI (inline script body only).
 * Kept verbatim; id is GTM-PBKZKV8F.
 */
export const GOOGLE_TAG_MANAGER_INLINE_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PBKZKV8F');`
