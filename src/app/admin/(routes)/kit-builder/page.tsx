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
  RefreshCw
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
    const existingIndex = formData.items.findIndex(i => i.equipmentId === eq.id)
    
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
      items: formData.items.filter(i => i.equipmentId !== equipmentId),
    })
  }

  const handleUpdateItemQuantity = (equipmentId: string, quantity: number) => {
    if (quantity < 1) return
    setFormData({
      ...formData,
      items: formData.items.map(i => 
        i.equipmentId === equipmentId ? { ...i, quantity } : i
      ),
    })
  }

  const calculateTotals = () => {
    const totalDailyRate = formData.items.reduce((sum, item) => sum + (item.dailyRate * item.quantity), 0)
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

  const filteredKits = kits.filter(kit => {
    const matchesSearch = kit.name.toLowerCase().includes(search.toLowerCase()) ||
                         kit.nameAr.includes(search)
    const matchesCategory = categoryFilter === 'all' || kit.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const { totalDailyRate, discount, finalDailyRate } = calculateTotals()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            منشئ الأطقم
          </h1>
          <p className="text-muted-foreground mt-1">
            إنشاء وإدارة حزم المعدات المجمعة
          </p>
        </div>
        <Button onClick={handleCreateKit}>
          <Plus className="h-4 w-4 ml-2" />
          طقم جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kits Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium">فشل تحميل البيانات</p>
            <p className="text-sm mb-4">{loadError}</p>
            <Button variant="outline" onClick={() => loadData()}>
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : filteredKits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">لا توجد أطقم</p>
            <p className="text-sm">ابدأ بإنشاء طقم جديد</p>
            <Button className="mt-4" onClick={handleCreateKit}>
              <Plus className="h-4 w-4 ml-2" />
              إنشاء طقم
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKits.map((kit) => {
            const categoryConfig = CATEGORY_CONFIG[kit.category]
            const CategoryIcon = categoryConfig.icon
            
            return (
              <Card key={kit.id} className={!kit.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
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
                  <p className="text-sm text-muted-foreground mb-4">{kit.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>عدد المعدات:</span>
                      <span className="font-medium">{kit.items.length} قطعة</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>السعر الأصلي:</span>
                      <span className="line-through text-muted-foreground">{formatCurrency(kit.totalDailyRate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الخصم:</span>
                      <span className="text-green-600">-{kit.discountPercent}%</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>السعر النهائي:</span>
                      <span className="text-primary">{formatCurrency(kit.finalDailyRate)}/يوم</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>استخدم {kit.usageCount} مرة</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditKit(kit)}>
                      <Edit className="h-4 w-4 ml-1" />
                      تعديل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicateKit(kit)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteKit(kit.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingKit ? 'تعديل الطقم' : 'إنشاء طقم جديد'}
            </DialogTitle>
            <DialogDescription>
              قم بتجميع المعدات في حزمة واحدة مع خصم
            </DialogDescription>
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
                    onValueChange={(v) => setFormData({ ...formData, category: v as Kit['category'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
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
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Kit Items */}
              <div>
                <label className="text-sm font-medium mb-2 block">المعدات المضافة ({formData.items.length})</label>
                {formData.items.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-muted-foreground">
                    اختر معدات من القائمة على اليسار
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {formData.items.map((item) => (
                      <div key={item.equipmentId} className="p-2 flex items-center justify-between">
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
                            onChange={(e) => handleUpdateItemQuantity(item.equipmentId, Number(e.target.value))}
                            className="w-16 h-8 text-center"
                          />
                          <span className="text-sm text-muted-foreground w-20">
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
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>المجموع:</span>
                  <span>{formatCurrency(totalDailyRate)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>الخصم ({formData.discountPercent}%):</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>السعر النهائي:</span>
                  <span className="text-primary">{formatCurrency(finalDailyRate)}/يوم</span>
                </div>
              </div>
            </div>

            {/* Right: Equipment Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">اختر المعدات</label>
              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                {equipment.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    لا توجد معدات متاحة
                  </div>
                ) : (
                  <div className="divide-y">
                    {equipment.map((eq) => {
                      const isAdded = formData.items.some(i => i.equipmentId === eq.id)
                      return (
                        <div
                          key={eq.id}
                          className={`p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer ${isAdded ? 'bg-primary/5' : ''}`}
                          onClick={() => handleAddItem(eq)}
                        >
                          <div>
                            <p className="font-medium">{eq.model || eq.sku}</p>
                            <p className="text-xs text-muted-foreground">{eq.sku} • {eq.category?.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatCurrency(Number(eq.dailyPrice))}/يوم</span>
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
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ الطقم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
