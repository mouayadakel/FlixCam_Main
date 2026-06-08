/**
 * Packages CMS Listing Page
 * Simplified to show a list of packages and a "Create New" button
 */

'use client'

import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Package,
  Plus,
  Edit,
  Search,
  ExternalLink,
  RefreshCw,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface KitItem {
  equipmentId: string
  quantity: number
}

interface EquipmentTabProps {
  initialItems: KitItem[]
  discountPercent: number
  onSave: (items: { equipmentId: string; quantity: number }[]) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

interface KitListItem {
  id: string
  name: string
  nameEn: string | null
  slug: string
  isActive: boolean
  cmsData: {
    cardImageUrl?: string
    seoTitle?: string
  }
}

export default function PackagesListing() {
  const { toast } = useToast()
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // New Package Dialog State
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newPkgName, setNewPkgName] = useState('')
  const [newPkgSlug, setNewPkgSlug] = useState('')
  const [creating, setCreating] = useState(false)

  const loadPackages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kits?isActive=all')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPackages(data.kits || [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الباقات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadPackages() }, [loadPackages])

  const handleCreate = async () => {
    if (!newPkgName.trim() || !newPkgSlug.trim()) {
      toast({ title: 'خطأ', description: 'الاسم والرابط مطلوبان', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPkgName,
          slug: newPkgSlug,
          items: [], // Schema now allows empty items
          cmsData: {}, // Will use defaults on edit page
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create')
      }
      const data = await res.json()
      toast({ title: 'تم الإنشاء ✅', description: 'يتم الآن الانتقال لصفحة التعديل' })
      setIsNewDialogOpen(false)
      // Redirect to edit page
      window.location.href = `/admin/cms/packages/${data.kit.id}`
    } catch (e) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل الإنشاء', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      if (!res.ok) throw new Error()
      loadPackages()
      toast({ title: current ? 'تم الإخفاء' : 'تم التفعيل' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل تغيير الحالة', variant: 'destructive' })
    }
  }

  const filtered = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Package className="h-8 w-8 text-primary" />
            محتوى الباقات
          </h1>
          <p className="mt-1 text-muted-foreground">
            إدارة صفحات الباقات، العروض التسويقية، والمحتوى
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPackages}>
            <RefreshCw className="me-1 h-4 w-4" />
            تحديث
          </Button>
          
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="me-1 h-4 w-4" />
                باقة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء باقة جديدة</DialogTitle>
                <DialogDescription>أدخل البيانات الأساسية للبدء في تخصيص الباقة</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الباقة</Label>
                  <Input 
                    id="name" 
                    value={newPkgName} 
                    onChange={(e) => {
                      setNewPkgName(e.target.value)
                      // Auto-slugify
                      if (!newPkgSlug) {
                        setNewPkgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''))
                      }
                    }} 
                    placeholder="مثال: باقة المبتدئين" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">الرابط (Slug)</Label>
                  <Input 
                    id="slug" 
                    value={newPkgSlug} 
                    onChange={(e) => setNewPkgSlug(e.target.value)} 
                    placeholder="example-package-link" 
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsNewDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
                  إنشاء ومتابعة التعديل
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الرابط..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-10"
          />
        </div>
        <Badge variant="outline" className="px-3 py-1">{packages.length} باقة</Badge>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p>لا توجد باقات تطابق بحثك</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">الصورة</TableHead>
                  <TableHead>الباقة</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>SEO</TableHead>
                  <TableHead className="text-end px-6">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pkg) => (
                  <TableRow key={pkg.id} className="group transition-colors hover:bg-muted/30">
                    <TableCell>
                      <div className="relative h-10 w-14 overflow-hidden rounded bg-muted border">
                        {pkg.cmsData?.cardImageUrl ? (
                          <Image
                            src={pkg.cmsData.cardImageUrl}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <ImageIcon className="absolute inset-0 m-auto h-5 w-5 opacity-20" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        {pkg.name}
                        {pkg.nameEn && <span className="block text-xs font-normal text-muted-foreground">{pkg.nameEn}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/{pkg.slug}</code>
                    </TableCell>
                    <TableCell>
                       <Switch
                        checked={pkg.isActive}
                        onCheckedChange={() => toggleActive(pkg.id, pkg.isActive)}
                      />
                    </TableCell>
                    <TableCell>
                      {pkg.cmsData?.seoTitle ? (
                        <CheckCircle2 className="h-5 w-5 text-success-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-end px-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/packages/${pkg.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="ms-2">
                          <Link href={`/admin/cms/packages/${pkg.id}`}>
                            <Edit className="h-4 w-4 me-2" />
                            تعديل
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
