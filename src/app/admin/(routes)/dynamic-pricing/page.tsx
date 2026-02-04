/**
 * @file dynamic-pricing/page.tsx
 * @description Dynamic Pricing - Manage pricing rules, seasonal rates, and discounts
 * @module app/admin/(routes)/dynamic-pricing
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Percent,
  TrendingUp,
  TrendingDown,
  Clock,
  Tag,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

type RuleType = 'seasonal' | 'duration' | 'early_bird' | 'last_minute' | 'bulk' | 'loyalty'
type AdjustmentType = 'percentage' | 'fixed'

interface PricingRule {
  id: string
  name: string
  nameAr: string
  description: string
  type: RuleType
  adjustmentType: AdjustmentType
  adjustmentValue: number // positive = increase, negative = discount
  conditions: {
    startDate?: string
    endDate?: string
    minDays?: number
    maxDays?: number
    minItems?: number
    daysBeforeStart?: number
    customerTier?: string
  }
  priority: number
  isActive: boolean
  appliedCount: number
  totalImpact: number // total revenue impact
  createdAt: string
}

const RULE_TYPE_CONFIG: Record<RuleType, { label: string; icon: any; color: string; description: string }> = {
  seasonal: { 
    label: 'موسمي', 
    icon: Calendar, 
    color: 'text-orange-600',
    description: 'تعديل الأسعار حسب المواسم والعطلات'
  },
  duration: { 
    label: 'مدة الإيجار', 
    icon: Clock, 
    color: 'text-blue-600',
    description: 'خصومات على الإيجارات الطويلة'
  },
  early_bird: { 
    label: 'حجز مبكر', 
    icon: TrendingDown, 
    color: 'text-green-600',
    description: 'خصم للحجوزات المبكرة'
  },
  last_minute: { 
    label: 'اللحظة الأخيرة', 
    icon: AlertCircle, 
    color: 'text-red-600',
    description: 'تعديل أسعار الحجوزات القريبة'
  },
  bulk: { 
    label: 'كمية', 
    icon: Tag, 
    color: 'text-purple-600',
    description: 'خصومات على الكميات الكبيرة'
  },
  loyalty: { 
    label: 'ولاء', 
    icon: TrendingUp, 
    color: 'text-yellow-600',
    description: 'مكافآت للعملاء المتكررين'
  },
}

export default function DynamicPricingPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<RuleType | 'all'>('all')
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [formData, setFormData] = useState<Partial<PricingRule>>({
    name: '',
    nameAr: '',
    description: '',
    type: 'seasonal',
    adjustmentType: 'percentage',
    adjustmentValue: -10,
    conditions: {},
    priority: 1,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  const apiTypeToPage = (t: string): RuleType => {
    const map: Record<string, RuleType> = {
      SEASONAL: 'seasonal',
      DURATION: 'duration',
      EARLY_BIRD: 'early_bird',
      DEMAND_BASED: 'last_minute',
      BUNDLE: 'bulk',
      CUSTOMER: 'loyalty',
    }
    return map[t] ?? 'seasonal'
  }
  const pageTypeToApi = (t: RuleType): string => {
    const map: Record<RuleType, string> = {
      seasonal: 'SEASONAL',
      duration: 'DURATION',
      early_bird: 'EARLY_BIRD',
      last_minute: 'DEMAND_BASED',
      bulk: 'BUNDLE',
      loyalty: 'CUSTOMER',
    }
    return map[t] ?? 'SEASONAL'
  }

  const loadRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pricing-rules')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const list = (data.rules ?? []).map((r: any) => {
        const cond = (r.conditions ?? {}) as Record<string, unknown>
        const conditions: PricingRule['conditions'] = {}
        if (cond.dateRange && typeof cond.dateRange === 'object') {
          const dr = cond.dateRange as { start?: string; end?: string }
          if (dr.start) conditions.startDate = dr.start.slice(0, 10)
          if (dr.end) conditions.endDate = dr.end.slice(0, 10)
        }
        if (typeof cond.minDuration === 'number') conditions.minDays = cond.minDuration
        if (typeof cond.maxDuration === 'number') conditions.maxDays = cond.maxDuration
        if (typeof cond.bookDaysAhead === 'number') conditions.daysBeforeStart = cond.bookDaysAhead
        return {
          id: r.id,
          name: r.name,
          nameAr: r.name,
          description: r.description ?? '',
          type: apiTypeToPage(r.ruleType),
          adjustmentType: (r.adjustmentType ?? 'PERCENTAGE').toLowerCase() as AdjustmentType,
          adjustmentValue: Number(r.adjustmentValue),
          conditions,
          priority: r.priority ?? 0,
          isActive: r.isActive ?? true,
          appliedCount: 0,
          totalImpact: 0,
          createdAt: r.createdAt ?? '',
        }
      })
      setRules(list)
    } catch (error) {
      console.error('Failed to load rules:', error)
      toast({
        title: 'خطأ',
        description: 'فشل تحميل قواعد التسعير',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      nameAr: '',
      description: '',
      type: 'seasonal',
      adjustmentType: 'percentage',
      adjustmentValue: -10,
      conditions: {},
      priority: rules.length + 1,
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const handleEditRule = (rule: PricingRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      nameAr: rule.nameAr,
      description: rule.description,
      type: rule.type,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      conditions: { ...rule.conditions },
      priority: rule.priority,
      isActive: rule.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleToggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId)
    if (!rule) return
    try {
      const res = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      await loadRules()
      toast({ title: 'تم التحديث', description: 'تم تحديث حالة القاعدة' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحديث القاعدة', variant: 'destructive' })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return
    try {
      const res = await fetch(`/api/pricing-rules/${ruleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      await loadRules()
      toast({ title: 'تم الحذف', description: 'تم حذف القاعدة بنجاح' })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل حذف القاعدة',
        variant: 'destructive',
      })
    }
  }

  const handleSaveRule = async () => {
    if (!formData.name) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم القاعدة',
        variant: 'destructive',
      })
      return
    }
    const conditions = formData.conditions ?? {}
    const apiConditions: Record<string, unknown> = {}
    if (conditions.startDate && conditions.endDate) {
      apiConditions.dateRange = { start: conditions.startDate, end: conditions.endDate }
    }
    if (typeof conditions.minDays === 'number') apiConditions.minDuration = conditions.minDays
    if (typeof conditions.maxDays === 'number') apiConditions.maxDuration = conditions.maxDays
    if (typeof conditions.daysBeforeStart === 'number') apiConditions.bookDaysAhead = conditions.daysBeforeStart

    setSaving(true)
    try {
      const body = {
        name: formData.name,
        description: formData.description || null,
        ruleType: pageTypeToApi(formData.type ?? 'seasonal'),
        priority: formData.priority ?? 0,
        conditions: apiConditions,
        adjustmentType: (formData.adjustmentType ?? 'percentage').toUpperCase(),
        adjustmentValue: formData.adjustmentValue ?? 0,
        isActive: formData.isActive ?? true,
      }
      const url = editingRule ? `/api/pricing-rules/${editingRule.id}` : '/api/pricing-rules'
      const method = editingRule ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save')
      }
      await loadRules()
      toast({
        title: 'تم الحفظ',
        description: editingRule ? 'تم تحديث القاعدة بنجاح' : 'تم إنشاء القاعدة بنجاح',
      })
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حفظ القاعدة',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredRules = activeTab === 'all' 
    ? rules 
    : rules.filter(r => r.type === activeTab)

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.isActive).length,
    totalApplied: rules.reduce((sum, r) => sum + r.appliedCount, 0),
    netImpact: rules.filter(r => r.isActive).reduce((sum, r) => sum + r.totalImpact, 0),
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            التسعير الديناميكي
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة قواعد التسعير والخصومات التلقائية
          </p>
        </div>
        <Button onClick={handleCreateRule}>
          <Plus className="h-4 w-4 ml-2" />
          قاعدة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">إجمالي القواعد</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">قواعد نشطة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalApplied}</p>
              <p className="text-sm text-muted-foreground">مرات التطبيق</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${stats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.netImpact >= 0 ? '+' : ''}{stats.netImpact.toLocaleString('ar-SA')} ر.س
              </p>
              <p className="text-sm text-muted-foreground">صافي التأثير</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>قواعد التسعير</CardTitle>
          <CardDescription>
            قم بإدارة قواعد التسعير الديناميكي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RuleType | 'all')}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">الكل ({rules.length})</TabsTrigger>
              {Object.entries(RULE_TYPE_CONFIG).map(([type, config]) => (
                <TabsTrigger key={type} value={type}>
                  {config.label} ({rules.filter(r => r.type === type).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">لا توجد قواعد</p>
                  <Button className="mt-4" onClick={handleCreateRule}>
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء قاعدة
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحالة</TableHead>
                      <TableHead>القاعدة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>التعديل</TableHead>
                      <TableHead>الشروط</TableHead>
                      <TableHead>التطبيقات</TableHead>
                      <TableHead>التأثير</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => {
                      const typeConfig = RULE_TYPE_CONFIG[rule.type]
                      const TypeIcon = typeConfig.icon
                      const isDiscount = rule.adjustmentValue < 0
                      
                      return (
                        <TableRow key={rule.id} className={!rule.isActive ? 'opacity-50' : ''}>
                          <TableCell>
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={() => handleToggleRule(rule.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rule.nameAr}</p>
                              <p className="text-xs text-muted-foreground">{rule.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                              <span>{typeConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isDiscount ? 'default' : 'destructive'}>
                              {isDiscount ? (
                                <TrendingDown className="h-3 w-3 ml-1" />
                              ) : (
                                <TrendingUp className="h-3 w-3 ml-1" />
                              )}
                              {rule.adjustmentValue > 0 ? '+' : ''}{rule.adjustmentValue}
                              {rule.adjustmentType === 'percentage' ? '%' : ' ر.س'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {rule.conditions.startDate && (
                                <div>من: {formatDate(rule.conditions.startDate)}</div>
                              )}
                              {rule.conditions.endDate && (
                                <div>إلى: {formatDate(rule.conditions.endDate)}</div>
                              )}
                              {rule.conditions.minDays && (
                                <div>الحد الأدنى: {rule.conditions.minDays} يوم</div>
                              )}
                              {rule.conditions.daysBeforeStart && (
                                <div>قبل: {rule.conditions.daysBeforeStart} يوم</div>
                              )}
                              {rule.conditions.minItems && (
                                <div>الحد الأدنى: {rule.conditions.minItems} قطعة</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{rule.appliedCount}</span>
                          </TableCell>
                          <TableCell>
                            <span className={rule.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {rule.totalImpact >= 0 ? '+' : ''}{rule.totalImpact.toLocaleString('ar-SA')} ر.س
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditRule(rule)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRule(rule.id)}>
                                <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'تعديل القاعدة' : 'إنشاء قاعدة جديدة'}
            </DialogTitle>
            <DialogDescription>
              قم بتحديد شروط وتعديلات التسعير
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">الاسم (عربي) *</label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="خصم الموسم"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم (إنجليزي) *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Season Discount"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف القاعدة..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">نوع القاعدة</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v as RuleType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الأولوية</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">نوع التعديل</label>
                <Select 
                  value={formData.adjustmentType} 
                  onValueChange={(v) => setFormData({ ...formData, adjustmentType: v as AdjustmentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">قيمة التعديل (سالب = خصم)</label>
                <Input
                  type="number"
                  value={formData.adjustmentValue}
                  onChange={(e) => setFormData({ ...formData, adjustmentValue: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Conditional Fields based on type */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">الشروط</h4>
              
              {(formData.type === 'seasonal') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">تاريخ البداية</label>
                    <Input
                      type="date"
                      value={formData.conditions?.startDate || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        conditions: { ...formData.conditions, startDate: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">تاريخ النهاية</label>
                    <Input
                      type="date"
                      value={formData.conditions?.endDate || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        conditions: { ...formData.conditions, endDate: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}

              {(formData.type === 'duration') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">الحد الأدنى للأيام</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.conditions?.minDays || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        conditions: { ...formData.conditions, minDays: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الحد الأقصى للأيام (اختياري)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.conditions?.maxDays || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        conditions: { ...formData.conditions, maxDays: Number(e.target.value) || undefined }
                      })}
                    />
                  </div>
                </div>
              )}

              {(formData.type === 'early_bird' || formData.type === 'last_minute') && (
                <div>
                  <label className="text-sm font-medium">عدد الأيام قبل البداية</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.conditions?.daysBeforeStart || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      conditions: { ...formData.conditions, daysBeforeStart: Number(e.target.value) }
                    })}
                  />
                </div>
              )}

              {(formData.type === 'bulk') && (
                <div>
                  <label className="text-sm font-medium">الحد الأدنى للمعدات</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.conditions?.minItems || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      conditions: { ...formData.conditions, minItems: Number(e.target.value) }
                    })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <label className="text-sm">تفعيل القاعدة</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveRule} disabled={saving}>
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
