/**
 * @file approvals/page.tsx
 * @description Approvals Center - Manage pending approvals for bookings, refunds, discounts, etc.
 * @module app/admin/(routes)/approvals
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Calendar,
  DollarSign,
  Percent,
  RotateCcw,
  User,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils/format.utils'

type ApprovalType = 'booking' | 'refund' | 'discount' | 'credit' | 'extension'
type ApprovalStatus = 'pending' | 'approved' | 'rejected'

interface ApprovalRequest {
  id: string
  type: ApprovalType
  status: ApprovalStatus
  requestedBy: {
    id: string
    name: string
    email: string
  }
  requestedAt: string
  subject: string
  description: string
  amount?: number
  percentage?: number
  relatedId?: string
  relatedType?: string
  metadata?: Record<string, any>
}

const TYPE_CONFIG: Record<ApprovalType, { label: string; icon: any; color: string }> = {
  booking: { label: 'حجز', icon: Calendar, color: 'text-blue-600' },
  refund: { label: 'استرداد', icon: RotateCcw, color: 'text-red-600' },
  discount: { label: 'خصم', icon: Percent, color: 'text-green-600' },
  credit: { label: 'رصيد', icon: DollarSign, color: 'text-purple-600' },
  extension: { label: 'تمديد', icon: Clock, color: 'text-orange-600' },
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'معلق', variant: 'secondary' },
  approved: { label: 'موافق', variant: 'default' },
  rejected: { label: 'مرفوض', variant: 'destructive' },
}

const RELATED_TYPE_TO_ROUTE: Record<string, string> = {
  booking: 'bookings',
  quote: 'quotes',
  payment: 'payments',
  contract: 'contracts',
  invoice: 'invoices',
  client: 'clients',
}

export default function ApprovalsPage() {
  const { toast } = useToast()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ApprovalType | 'all'>('all')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [isLoadingRef, setIsLoadingRef] = useState(false)

  useEffect(() => {
    if (!isLoadingRef) {
      setIsLoadingRef(true)
      loadApprovals()
    }
  }, [])

  const loadApprovals = async () => {
    setLoading(true)
    try {
      const pendingRes = await fetch('/api/approvals/pending').catch(() => null)
      const mapped: ApprovalRequest[] = []

      if (pendingRes?.ok) {
        const { approvals } = await pendingRes.json()
        const list = Array.isArray(approvals) ? approvals : []
        for (const approval of list) {
          const customer = approval.payment?.booking?.customer
          const typeFromAction = approval.action?.includes('refund')
            ? 'refund'
            : approval.action?.includes('discount') || approval.action?.includes('credit')
              ? 'discount'
              : approval.resourceType === 'booking'
                ? 'booking'
                : 'extension'
          mapped.push({
            id: approval.id,
            type: typeFromAction as ApprovalType,
            status: 'pending',
            requestedBy: {
              id: approval.requestedBy,
              name: customer?.name ?? '—',
              email: customer?.email ?? '',
            },
            requestedAt: approval.createdAt,
            subject: approval.reason || approval.action || 'طلب موافقة',
            description: approval.reason || approval.action || '',
            amount: approval.payment?.amount ?? undefined,
            relatedId: approval.resourceId,
            relatedType: approval.resourceType?.replace(/s$/, '') || 'booking',
            metadata: approval.metadata,
          })
        }
      }

      setApprovals(mapped)
    } catch (error) {
      console.error('Failed to load approvals:', error)
      toast({
        title: 'خطأ',
        description: 'فشل تحميل طلبات الموافقة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedApproval || !actionType) return
    if (actionType === 'reject' && !notes.trim()) {
      toast({
        title: 'مطلوب',
        description: 'يرجى إدخال سبب الرفض',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    try {
      const endpoint =
        actionType === 'approve'
          ? `/api/approvals/${selectedApproval.id}/approve`
          : `/api/approvals/${selectedApproval.id}/reject`
      const body =
        actionType === 'approve'
          ? JSON.stringify({ notes: notes.trim() || undefined })
          : JSON.stringify({ reason: notes.trim() })

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || res.statusText || 'فشل تنفيذ الإجراء')
      }

      setApprovals(prev =>
        prev.filter(a => a.id !== selectedApproval.id)
      )

      toast({
        title: actionType === 'approve' ? 'تمت الموافقة' : 'تم الرفض',
        description:
          actionType === 'approve'
            ? 'تمت الموافقة على الطلب بنجاح'
            : 'تم رفض الطلب',
      })

      setSelectedApproval(null)
      setActionType(null)
      setNotes('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل تنفيذ الإجراء'
      toast({
        title: 'خطأ',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending')
  const filteredApprovals = activeTab === 'all' 
    ? pendingApprovals 
    : pendingApprovals.filter(a => a.type === activeTab)

  const stats = {
    total: pendingApprovals.length,
    booking: pendingApprovals.filter(a => a.type === 'booking').length,
    refund: pendingApprovals.filter(a => a.type === 'refund').length,
    discount: pendingApprovals.filter(a => a.type === 'discount').length,
    credit: pendingApprovals.filter(a => a.type === 'credit').length,
    extension: pendingApprovals.filter(a => a.type === 'extension').length,
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الموافقات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة طلبات الموافقة المعلقة
          </p>
        </div>
        <Button variant="outline" onClick={loadApprovals} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">إجمالي المعلق</p>
            </div>
          </CardContent>
        </Card>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon
          return (
            <Card key={type}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${config.color}`} />
                  <p className="text-xl font-bold">{stats[type as ApprovalType]}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات الموافقة المعلقة</CardTitle>
          <CardDescription>
            راجع وقرر بشأن الطلبات المعلقة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ApprovalType | 'all')}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
              <TabsTrigger value="booking">حجوزات ({stats.booking})</TabsTrigger>
              <TabsTrigger value="refund">استردادات ({stats.refund})</TabsTrigger>
              <TabsTrigger value="discount">خصومات ({stats.discount})</TabsTrigger>
              <TabsTrigger value="extension">تمديدات ({stats.extension})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredApprovals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">لا توجد طلبات معلقة</p>
                  <p className="text-sm">جميع الطلبات تمت معالجتها</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>الموضوع</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>القيمة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => {
                      const typeConfig = TYPE_CONFIG[approval.type]
                      const TypeIcon = typeConfig.icon
                      
                      return (
                        <TableRow key={approval.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                              <span>{typeConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{approval.subject}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {approval.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{approval.requestedBy.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {approval.amount && formatCurrency(approval.amount)}
                            {approval.percentage && `${approval.percentage}%`}
                            {!approval.amount && !approval.percentage && '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDate(approval.requestedAt)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {approval.relatedId && approval.relatedType && RELATED_TYPE_TO_ROUTE[approval.relatedType] && (
                                <Link href={`/admin/${RELATED_TYPE_TO_ROUTE[approval.relatedType]}/${approval.relatedId}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedApproval(approval)
                                  setActionType('approve')
                                }}
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                موافقة
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApproval(approval)
                                  setActionType('reject')
                                }}
                              >
                                <XCircle className="h-4 w-4 ml-1" />
                                رفض
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedApproval && !!actionType} onOpenChange={() => {
        setSelectedApproval(null)
        setActionType(null)
        setNotes('')
      }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.subject}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{selectedApproval?.description}</p>
              {selectedApproval?.amount && (
                <p className="text-lg font-bold mt-2">{formatCurrency(selectedApproval.amount)}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedApproval(null)
                setActionType(null)
                setNotes('')
              }}
            >
              إلغاء
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? 'جاري...' : actionType === 'approve' ? 'موافقة' : 'رفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
