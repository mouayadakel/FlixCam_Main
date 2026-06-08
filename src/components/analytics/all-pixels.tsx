'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface PixelProps {
  id: string
}

export function TikTokPixel({ id }: PixelProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ttq) {
      (window as any).ttq.page()
    }
  }, [pathname, searchParams])

  if (!id) return null
  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
  ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
  ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},
  ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
  ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
  ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");
  o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
  var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${id}');ttq.page();
}(window, document, 'ttq');`,
      }}
    />
  )
}

export function SnapchatPixel({ id }: PixelProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).snaptr) {
      (window as any).snaptr('track', 'PAGE_VIEW')
    }
  }, [pathname, searchParams])

  if (!id) return null
  return (
    <Script
      id="snapchat-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,
'https://sc-static.net/scevent.min.js');
snaptr('init', '${id}', {});
snaptr('track', 'PAGE_VIEW');`,
      }}
    />
  )
}

export function PinterestTag({ id }: PixelProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).pintrk) {
      (window as any).pintrk('page')
    }
  }, [pathname, searchParams])

  if (!id) return null
  return (
    <Script
      id="pinterest-tag"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(
Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";
var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName
("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${id}', {em: ''});
pintrk('page');`,
      }}
    />
  )
}

export function MicrosoftClarity({ id }: PixelProps) {
  if (!id) return null
  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${id}");`,
      }}
    />
  )
}

export function TwitterXPixel({ id }: PixelProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).twq) {
      (window as any).twq('track', 'PageView')
    }
  }, [pathname, searchParams])

  if (!id) return null
  return (
    <Script
      id="twitter-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${id}');`,
      }}
    />
  )
}

export function GoogleAdsGtag({ conversionId, conversionLabel }: { conversionId: string; conversionLabel: string }) {
  if (!conversionId) return null
  const hasLabel = conversionLabel && conversionLabel.length > 0
  return (
    <Script
      id="google-ads"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${conversionId}`}
      onLoad={() => {
        if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
        window.gtag('js', new Date())
        window.gtag('config', conversionId)
        if (hasLabel) {
          window.gtag('event', 'conversion', {
            send_to: `${conversionId}/${conversionLabel}`,
          })
        }
      }}
    />
  )
}
