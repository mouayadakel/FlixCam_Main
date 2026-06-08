'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

type PushState = 'unsupported' | 'unconfigured' | 'default' | 'denied' | 'subscribed' | 'loading'

export function PushNotificationSetup() {
  const [state, setState] = useState<PushState>('loading')
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported')
      return
    }

    fetch('/api/push/vapid-public-key')
      .then((r) => r.json())
      .then((data: { configured?: boolean; publicKey?: string }) => {
        if (!data.configured || !data.publicKey) {
          setState('unconfigured')
          return
        }
        setPublicKey(data.publicKey)
        if (Notification.permission === 'denied') {
          setState('denied')
        } else if (Notification.permission === 'granted') {
          setState('subscribed')
        } else {
          setState('default')
        }
      })
      .catch(() => setState('unconfigured'))
  }, [])

  const subscribe = useCallback(async () => {
    if (!publicKey) return
    setState('loading')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'default')
        return
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setState('default')
        return
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      })

      if (!res.ok) {
        setState('default')
        return
      }

      setState('subscribed')
    } catch {
      setState('default')
    }
  }, [publicKey])

  const unsubscribe = useCallback(async () => {
    setState('loading')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setState('default')
    } catch {
      setState('default')
    }
  }, [])

  if (state === 'unsupported' || state === 'unconfigured') {
    return null
  }

  if (state === 'denied') {
    return (
      <span className="text-xs text-neutral-500" title="Enable notifications in browser settings">
        <BellOff className="inline h-3.5 w-3.5" aria-hidden />
      </span>
    )
  }

  if (state === 'subscribed') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-neutral-600"
        onClick={unsubscribe}
        title="Disable push notifications"
      >
        <Bell className="h-3.5 w-3.5 text-[#A3E635]" aria-hidden />
        <span className="hidden sm:inline">إشعارات مفعّلة</span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={subscribe}
      disabled={state === 'loading'}
      title="Enable push notifications"
    >
      <Bell className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">تفعيل الإشعارات</span>
    </Button>
  )
}
