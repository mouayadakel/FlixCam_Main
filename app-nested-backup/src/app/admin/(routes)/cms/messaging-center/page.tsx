'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare } from 'lucide-react'

const WhatsAppTab = dynamic(() => import('./whatsapp/page').then((m) => ({ default: m.default })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
const EmailTab = dynamic(() => import('./email/page').then((m) => ({ default: m.default })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
const SmsTab = dynamic(() => import('./sms/page').then((m) => ({ default: m.default })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
const TemplatesTab = dynamic(() => import('./templates/page').then((m) => ({ default: m.default })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
const AutomationTab = dynamic(() => import('./automation/page').then((m) => ({ default: m.default })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
const RecipientsTab = dynamic(() => import('./recipients/page').then((m) => ({ default: m.default })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})

const TAB_VALUES = ['whatsapp', 'email', 'sms', 'templates', 'automation', 'recipients'] as const

export default function MessagingCenterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab') ?? 'whatsapp'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'whatsapp'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'whatsapp'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'whatsapp') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/cms/messaging-center${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <MessageSquare className="h-8 w-8" />
          مركز الرسائل
        </h1>
        <p className="mt-1 text-muted-foreground">
          إدارة البريد الإلكتروني وواتساب وSMS مع التحكم الكامل في التفعيل والقوالب والأتمتة
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="whatsapp">واتساب</TabsTrigger>
          <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="templates">قوالب الرسائل</TabsTrigger>
          <TabsTrigger value="automation">قواعد الأتمتة</TabsTrigger>
          <TabsTrigger value="recipients">المستلمون الداخليون</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppTab />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <EmailTab />
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <SmsTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="automation" className="mt-4">
          <AutomationTab />
        </TabsContent>
        <TabsContent value="recipients" className="mt-4">
          <RecipientsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
