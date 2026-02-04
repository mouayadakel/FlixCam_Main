/**
 * @file marketing/page.tsx
 * @description Marketing campaigns list page
 * @module app/admin/(routes)/marketing
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Mail, MessageSquare, Send, Calendar } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { TableSkeleton } from '@/components/admin/table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/states/empty-state'
import type { CampaignStatus, CampaignType } from '@/lib/types/marketing.types'

interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject?: string | null
  scheduledAt?: string | null
  sentAt?: string | null
  totalRecipients: number
  sentCount: number
  openedCount?: number
  clickedCount?: number
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<CampaignStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { ar: 'مسودة', en: 'Draft', variant: 'outline' },
  scheduled: { ar: 'مجدولة', en: 'Scheduled', variant: 'secondary' },
  active: { ar: 'نشطة', en: 'Active', variant: 'default' },
  paused: { ar: 'متوقفة', en: 'Paused', variant: 'secondary' },
  completed: { ar: 'مكتملة', en: 'Completed', variant: 'default' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled', variant: 'destructive' },
}

const TYPE_LABELS: Record<CampaignType, { ar: string; en: string; icon: any }> = {
  email: { ar: 'بريد إلكتروني', en: 'Email', icon: Mail },
  sms: { ar: 'رسالة نصية', en: 'SMS', icon: MessageSquare },
  push: { ar: 'إشعار', en: 'Push', icon: Send },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp', icon: MessageSquare },
}

export default function MarketingPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const statuses: Array<CampaignStatus | 'all'> = [
    'all',
    'draft',
    'scheduled',
    'active',
    'paused',
    'completed',
    'cancelled',
  ]

  const types: Array<CampaignType | 'all'> = [
    'all',
    'email',
    'sms',
    'push',
    'whatsapp',
  ]

  useEffect(() => {
    loadCampaigns()
  }, [statusFilter, typeFilter, searchQuery])

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('page', '1')
      params.set('pageSize', '50')

      const response = await fetch(`/api/marketing/campaigns?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الحملات')
      }

      const data = await response.json()
      setCampaigns(data.data || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الحملات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCampaigns = useMemo(() => {
    return campaigns
  }, [campaigns])

  const getStatusLabel = (status: CampaignStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getStatusVariant = (status: CampaignStatus) => {
    return STATUS_LABELS[status]?.variant || 'default'
  }

  const getTypeLabel = (type: CampaignType) => {
    return TYPE_LABELS[type]?.ar || type
  }

  const getTypeIcon = (type: CampaignType) => {
    const Icon = TYPE_LABELS[type]?.icon ?? Mail
    return (<Icon className="h-4 w-4" />)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التسويق</h1>
          <p className="text-muted-foreground mt-2">
            إدارة الحملات التسويقية
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/marketing/campaigns/new">
            <Plus className="h-4 w-4 ml-2" />
            حملة جديدة
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="البحث باسم الحملة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg flex-1 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'جميع الحالات' : STATUS_LABELS[status as CampaignStatus]?.ar || status}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as CampaignType]?.ar || type}
            </option>
          ))}
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم الحملة</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الموضوع</TableHead>
              <TableHead>المستلمون</TableHead>
              <TableHead>المُرسل</TableHead>
              <TableHead>تاريخ الإرسال</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  لا توجد حملات
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(campaign.type)}
                      {getTypeLabel(campaign.type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.subject || '-'}</TableCell>
                  <TableCell>
                    {campaign.totalRecipients > 0 ? (
                      <div>
                        {campaign.sentCount} / {campaign.totalRecipients}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {campaign.sentCount > 0 ? (
                      <div className="text-green-600 font-medium">
                        {campaign.sentCount}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {campaign.sentAt ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(campaign.sentAt)}
                      </div>
                    ) : campaign.scheduledAt ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(campaign.scheduledAt)}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/marketing/campaigns/${campaign.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
      </div>
    </div>
  )
}
