/**
 * @file kit-builder/page.tsx
 * @description Kit Builder - Create and manage equipment bundles/packages
 * @module app/admin/(routes)/kit-builder
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  Eye,
  Save,
  X,
  GripVertical,
  Camera,
  Video,
  Lightbulb,
  Mic,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'

interface KitItem {
  equipmentId: string
  sku: string
  name: string
  quantity: number
  dailyRate: number
}

interface Kit {
  id: string
  name: string
  nameAr: string
  description: string
  category: 'video' | 'photo' | 'audio' | 'lighting' | 'complete'
  items: KitItem[]
  totalDailyRate: number
  discountPercent: number
  finalDailyRate: number
  isActive: boolean
  usageCount: number
  createdAt: string
}

interface AvailableEquipment {
  id: string
  sku: string
  model: string
  dailyPrice: number
  category: { name: string }
}

const CATEGORY_CONFIG = {
  video: { label: 'فيديو', icon: Video, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  photo: { label: 'تصوير', icon: Camera, color: 'text-green-600', bgColor: 'bg-green-100' },
  audio: { label: 'صوت', icon: Mic, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  lighting: { label: 'إضاءة', icon: Lightbulb, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  complete: { label: 'كامل', icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

export default function KitBuilderPage() {
  const { toast } = useToast()
  const [kits, setKits] = useState<Kit[]>([])
  const [equipment, setEquipment] = useState<AvailableEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingKit, setEditingKit] = useState<Kit | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    category: 'complete' as Kit['category'],
    discountPercent: 10,
    isActive: true,
    items: [] as KitItem[],
  })
  const [saving, setSaving] = useState(false)
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)
  const [aiProjectType, setAiProjectType] = useState('سينمائي')
  const [aiDuration, setAiDuration] = useState(7)
  const [aiBudget, setAiBudget] = useState(10000)
  const [aiRequirements, setAiRequirements] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [equipmentRes, kitsRes] = await Promise.all([
        fetch('/api/equipment?isActive=true&limit=100'),
        fetch('/api/kits'),
      ])

      if (equipmentRes?.ok) {
        const data = await equipmentRes.json()
        setEquipment(data.items || [])
      }

      if (kitsRes?.ok) {
        const kitsData = await kitsRes.json()
        const list = Array.isArray(kitsData.kits) ? kitsData.kits : []
        setKits(
          list.map((k: any) => ({
            id: k.id,
            name: k.name ?? '',
            nameAr: k.nameAr ?? k.name ?? '',
            description: k.description ?? '',
            category: (k.category ?? 'complete') as Kit['category'],
            items: (k.items ?? []).map((i: any) => ({
              equipmentId: i.equipmentId,
              sku: i.equipment?.sku ?? '',
              name: i.equipment?.model ?? i.equipment?.sku ?? '',
              quantity: i.quantity ?? 1,
              dailyRate: Number(i.dailyPrice ?? i.equipment?.dailyPrice ?? 0),
            })),
            totalDailyRate: k.totalDailyRate ?? 0,
            discountPercent: Number(k.discountPercent ?? 0),
            finalDailyRate: k.finalDailyRate ?? 0,
            isActive: k.isActive !== false,
            usageCount: 0,
            createdAt: k.createdAt ?? new Date().toISOString(),
          }))
        )
      } else {
        setKits([])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setLoadError(error instanceof Error ? error.message : 'فشل تحميل البيانات')
      setKits([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKit = () => {
    setEditingKit(null)
    setFormData({
      name: '',
      nameAr: '',
      description: '',
      category: 'complete',
      discountPercent: 10,
      isActive: true,
      items: [],
    })
    setIsDialogOpen(true)
  }

  const handleEditKit = (kit: Kit) => {
    setEditingKit(kit)
    setFormData({
      name: kit.name,
      nameAr: kit.nameAr,
      description: kit.description,
      category: kit.category,
      discountPercent: kit.discountPercent,
      isActive: kit.isActive,
      items: [...kit.items],
    })
    setIsDialogOpen(true)
  }

  const handleDuplicateKit = (kit: Kit) => {
    setEditingKit(null)
    setFormData({
      name: `${kit.name} (نسخة)`,
      nameAr: `${kit.nameAr} (نسخة)`,
      description: kit.description,
      category: kit.category,
      discountPercent: kit.discountPercent,
      isActive: false,
      items: [...kit.items],
    })
    setIsDialogOpen(true)
  }

  const handleDeleteKit = async (kitId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطقم؟')) return

    try {
      const res = await fetch(`/api/kits/${kitId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete kit')
      }
      await loadData()
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الطقم بنجاح',
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حذف الطقم',
        variant: 'destructive',
      })
    }
  }

  const handleAddItem = (eq: AvailableEquipment) => {
    const existingIndex = formData.items.findIndex((i) => i.equipmentId === eq.id)

    if (existingIndex >= 0) {
      // Increment quantity
      const newItems = [...formData.items]
      newItems[existingIndex].quantity += 1
      setFormData({ ...formData, items: newItems })
    } else {
      // Add new item
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          {
            equipmentId: eq.id,
            sku: eq.sku,
            name: eq.model || eq.sku,
            quantity: 1,
            dailyRate: Number(eq.dailyPrice),
          },
        ],
      })
    }
  }

  const handleRemoveItem = (equipmentId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((i) => i.equipmentId !== equipmentId),
    })
  }

  const handleUpdateItemQuantity = (equipmentId: string, quantity: number) => {
    if (quantity < 1) return
    setFormData({
      ...formData,
      items: formData.items.map((i) => (i.equipmentId === equipmentId ? { ...i, quantity } : i)),
    })
  }

  const handleAISuggest = async () => {
    setAiSuggestLoading(true)
    try {
      const res = await fetch('/api/ai/kit-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: aiProjectType,
          duration: aiDuration,
          budget: aiBudget,
          requirements: aiRequirements
            ? aiRequirements.trim().split(/\n/).filter(Boolean)
            : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'فشل الاقتراح')
      }
      const data = await res.json()
      const kits = data.kits ?? []
      const firstKit = kits[0]
      if (!firstKit?.equipment?.length) {
        toast({
          title: 'تنبيه',
          description: 'لم يُرجع الذكاء الاصطناعي معدات. جرّب تغيير المعايير.',
        })
        return
      }
      const suggestedItems: KitItem[] = []
      for (const eq of firstKit.equipment) {
        const id = eq.equipmentId ?? eq.equipment?.id
        if (!id) continue
        const found = equipment.find((e) => e.id === id)
        if (found) {
          suggestedItems.push({
            equipmentId: found.id,
            sku: found.sku,
            name: found.model ?? found.sku,
            quantity: eq.quantity ?? 1,
            dailyRate: Number(eq.dailyPrice ?? found.dailyPrice ?? 0),
          })
        }
      }
      setFormData((prev) => ({ ...prev, items: suggestedItems }))
      toast({
        title: 'تم',
        description: `تم اقتراح ${suggestedItems.length} معدات. يمكنك التعديل ثم حفظ الطقم.`,
      })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل اقتراح المعدات',
        variant: 'destructive',
      })
    } finally {
      setAiSuggestLoading(false)
    }
  }

  const calculateTotals = () => {
    const totalDailyRate = formData.items.reduce(
      (sum, item) => sum + item.dailyRate * item.quantity,
      0
    )
    const discount = totalDailyRate * (formData.discountPercent / 100)
    const finalDailyRate = totalDailyRate - discount
    return { totalDailyRate, discount, finalDailyRate }
  }

  const handleSaveKit = async () => {
    if (!formData.name || formData.items.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء الاسم وإضافة معدات على الأقل',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const slug =
        formData.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9_-]/g, '') || `kit-${Date.now()}`
      const itemsPayload = formData.items.map((i) => ({
        equipmentId: i.equipmentId,
        quantity: i.quantity,
      }))

      if (editingKit) {
        const res = await fetch(`/api/kits/${editingKit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            discountPercent: formData.discountPercent ?? 0,
            isActive: formData.isActive,
            items: itemsPayload,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update kit')
        }
      } else {
        const res = await fetch('/api/kits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            slug,
            description: formData.description || null,
            discountPercent: formData.discountPercent ?? 0,
            isActive: formData.isActive,
            items: itemsPayload,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create kit')
        }
      }

      await loadData()
      toast({
        title: 'تم الحفظ',
        description: editingKit ? 'تم تحديث الطقم بنجاح' : 'تم إنشاء الطقم بنجاح',
      })
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حفظ الطقم',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredKits = kits.filter((kit) => {
    const matchesSearch =
      kit.name.toLowerCase().includes(search.toLowerCase()) || kit.nameAr.includes(search)
    const matchesCategory = categoryFilter === 'all' || kit.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const { totalDailyRate, discount, finalDailyRate } = calculateTotals()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Package className="h-8 w-8 text-primary" />
            منشئ الأطقم
          </h1>
          <p className="mt-1 text-muted-foreground">إنشاء وإدارة حزم المعدات المجمعة</p>
        </div>
        <Button onClick={handleCreateKit}>
          <Plus className="ms-2 h-4 w-4" />
          طقم جديد
        </Button>
      </div>

      <Tabs defaultValue="kits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kits">الحزم</TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart3 className="ms-1 h-4 w-4" />
            أداء الحزم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kits" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pe-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="جميع الفئات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Kits Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : loadError ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <p className="text-lg font-medium">فشل تحميل البيانات</p>
                <p className="mb-4 text-sm">{loadError}</p>
                <Button variant="outline" onClick={() => loadData()}>
                  <RefreshCw className="ms-2 h-4 w-4" />
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          ) : filteredKits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">لا توجد أطقم</p>
                <p className="text-sm">ابدأ بإنشاء طقم جديد</p>
                <Button className="mt-4" onClick={handleCreateKit}>
                  <Plus className="ms-2 h-4 w-4" />
                  إنشاء طقم
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredKits.map((kit) => {
                const categoryConfig = CATEGORY_CONFIG[kit.category]
                const CategoryIcon = categoryConfig.icon

                return (
                  <Card key={kit.id} className={!kit.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-lg p-2 ${categoryConfig.bgColor}`}>
                            <CategoryIcon className={`h-5 w-5 ${categoryConfig.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{kit.nameAr}</CardTitle>
                            <p className="text-sm text-muted-foreground">{kit.name}</p>
                          </div>
                        </div>
                        <Badge variant={kit.isActive ? 'default' : 'secondary'}>
                          {kit.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-sm text-muted-foreground">{kit.description}</p>

                      <div className="mb-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>عدد المعدات:</span>
                          <span className="font-medium">{kit.items.length} قطعة</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>السعر الأصلي:</span>
                          <span className="text-muted-foreground line-through">
                            {formatCurrency(kit.totalDailyRate)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>الخصم:</span>
                          <span className="text-green-600">-{kit.discountPercent}%</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>السعر النهائي:</span>
                          <span className="text-primary">
                            {formatCurrency(kit.finalDailyRate)}/يوم
                          </span>
                        </div>
                      </div>

                      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>استخدم {kit.usageCount} مرة</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditKit(kit)}
                        >
                          <Edit className="ms-1 h-4 w-4" />
                          تعديل
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDuplicateKit(kit)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteKit(kit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أداء الحزم</CardTitle>
              <CardDescription>أعلى الأطقم حسب عدد مرات الاستخدام والإيرادات</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : filteredKits.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">لا توجد بيانات أطقم لعرضها</p>
              ) : (
                <>
                  <div className="mb-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...filteredKits]
                          .sort((a, b) => b.usageCount - a.usageCount)
                          .slice(0, 10)
                          .map((k) => ({
                            name: k.nameAr || k.name,
                            استخدامات: k.usageCount,
                            إيراد: Math.round(k.finalDailyRate * k.usageCount),
                          }))}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="استخدامات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الطقم</TableHead>
                        <TableHead className="text-center">مرات الاستخدام</TableHead>
                        <TableHead className="text-start">السعر اليومي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...filteredKits]
                        .sort((a, b) => b.usageCount - a.usageCount)
                        .slice(0, 20)
                        .map((kit) => (
                          <TableRow key={kit.id}>
                            <TableCell className="font-medium">{kit.nameAr || kit.name}</TableCell>
                            <TableCell className="text-center">{kit.usageCount}</TableCell>
                            <TableCell className="text-start">
                              {formatCurrency(kit.finalDailyRate)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingKit ? 'تعديل الطقم' : 'إنشاء طقم جديد'}</DialogTitle>
            <DialogDescription>قم بتجميع المعدات في حزمة واحدة مع خصم</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: Kit Details */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">الاسم (عربي) *</label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="طقم التصوير الاحترافي"
                />
              </div>

              <div>
                <label className="text-sm font-medium">الاسم (إنجليزي) *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Professional Video Kit"
                />
              </div>

              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر للطقم..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">الفئة</label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData({ ...formData, category: v as Kit['category'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">نسبة الخصم %</label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.discountPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, discountPercent: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Kit Items */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  المعدات المضافة ({formData.items.length})
                </label>
                {formData.items.length === 0 ? (
                  <div className="rounded-lg border p-4 text-center text-muted-foreground">
                    اختر معدات من القائمة على اليسار
                  </div>
                ) : (
                  <div className="max-h-48 divide-y overflow-y-auto rounded-lg border">
                    {formData.items.map((item) => (
                      <div key={item.equipmentId} className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemQuantity(item.equipmentId, Number(e.target.value))
                            }
                            className="h-8 w-16 text-center"
                          />
                          <span className="w-20 text-sm text-muted-foreground">
                            {formatCurrency(item.dailyRate * item.quantity)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item.equipmentId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <div className="flex justify-between">
                  <span>المجموع:</span>
                  <span>{formatCurrency(totalDailyRate)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>الخصم ({formData.discountPercent}%):</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>السعر النهائي:</span>
                  <span className="text-primary">{formatCurrency(finalDailyRate)}/يوم</span>
                </div>
              </div>
            </div>

            {/* Right: Equipment Selection */}
            <div>
              <Accordion type="single" collapsible className="mb-4">
                <AccordionItem value="ai-suggest">
                  <AccordionTrigger className="text-sm">
                    <Sparkles className="ms-2 h-4 w-4" />
                    اقتراح ذكي بالذكاء الاصطناعي
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 rounded-lg border p-3">
                      <div>
                        <label className="text-xs font-medium">نوع المشروع</label>
                        <Select value={aiProjectType} onValueChange={setAiProjectType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="تصوير أفراح">تصوير أفراح</SelectItem>
                            <SelectItem value="تصوير أحداث">تصوير أحداث</SelectItem>
                            <SelectItem value="سينمائي">سينمائي</SelectItem>
                            <SelectItem value="رياضي">رياضي</SelectItem>
                            <SelectItem value="استوديو">استوديو</SelectItem>
                            <SelectItem value="أخرى">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium">المدة (أيام)</label>
                          <Input
                            type="number"
                            min={1}
                            value={aiDuration}
                            onChange={(e) => setAiDuration(Number(e.target.value) || 1)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">الميزانية (ر.س)</label>
                          <Input
                            type="number"
                            min={0}
                            value={aiBudget}
                            onChange={(e) => setAiBudget(Number(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium">متطلبات (اختياري)</label>
                        <Textarea
                          placeholder="وصف موجز للمشروع..."
                          value={aiRequirements}
                          onChange={(e) => setAiRequirements(e.target.value)}
                          className="mt-1 min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAISuggest}
                        disabled={aiSuggestLoading || equipment.length === 0}
                      >
                        {aiSuggestLoading ? 'جاري الاقتراح...' : 'اقتراح معدات'}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <label className="mb-2 block text-sm font-medium">اختر المعدات</label>
              <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                {equipment.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">لا توجد معدات متاحة</div>
                ) : (
                  <div className="divide-y">
                    {equipment.map((eq) => {
                      const isAdded = formData.items.some((i) => i.equipmentId === eq.id)
                      return (
                        <div
                          key={eq.id}
                          className={`flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50 ${isAdded ? 'bg-primary/5' : ''}`}
                          onClick={() => handleAddItem(eq)}
                        >
                          <div>
                            <p className="font-medium">{eq.model || eq.sku}</p>
                            <p className="text-xs text-muted-foreground">
                              {eq.sku} • {eq.category?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {formatCurrency(Number(eq.dailyPrice))}/يوم
                            </span>
                            <Button size="sm" variant={isAdded ? 'secondary' : 'outline'}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveKit} disabled={saving}>
              <Save className="ms-2 h-4 w-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ الطقم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
