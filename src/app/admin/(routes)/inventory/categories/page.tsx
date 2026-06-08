/**
 * @file page.tsx
 * @description Equipment categories management – list, create, edit, delete (real API)
 * @module app/admin/(routes)/inventory/categories
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, FolderTree, RefreshCw, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  nameAr?: string | null
  nameEn?: string | null
  nameZh?: string | null
  nameFr?: string | null
  slug: string
  description: string | null
  parentId: string | null
  isActive: boolean
  sortOrder: number
  equipmentCount: number
  childrenCount?: number
  createdAt: string
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    nameEn: '',
    nameZh: '',
    nameFr: '',
    slug: '',
    description: '',
    parentId: '' as string,
    isActive: true,
    sortOrder: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to load categories')
      const data = await response.json()
      setCategories(data.categories ?? data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr || null,
          nameEn: formData.nameEn || null,
          nameZh: formData.nameZh || null,
          nameFr: formData.nameFr || null,
          slug: formData.slug || undefined,
          description: formData.description || null,
          parentId: formData.parentId || null,
          isActive: formData.isActive,
          sortOrder: formData.sortOrder,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Failed to create category')

      toast({ title: 'Success', description: 'Category created' })
      setIsCreateOpen(false)
      resetForm()
      loadCategories()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create category',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedCategory) return
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr || null,
          nameEn: formData.nameEn || null,
          nameZh: formData.nameZh || null,
          nameFr: formData.nameFr || null,
          slug: formData.slug || undefined,
          description: formData.description || null,
          parentId: formData.parentId || null,
          isActive: formData.isActive,
          sortOrder: formData.sortOrder,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Failed to update category')

      toast({ title: 'Success', description: 'Category updated' })
      setIsEditOpen(false)
      resetForm()
      loadCategories()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update category',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Failed to delete category')

      toast({ title: 'Success', description: 'Category deleted' })
      setIsDeleteOpen(false)
      setSelectedCategory(null)
      loadCategories()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      nameAr: category.nameAr ?? '',
      nameEn: category.nameEn ?? '',
      nameZh: category.nameZh ?? '',
      nameFr: category.nameFr ?? '',
      slug: category.slug,
      description: category.description ?? '',
      parentId: category.parentId ?? '',
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      nameAr: '',
      nameEn: '',
      nameZh: '',
      nameFr: '',
      slug: '',
      description: '',
      parentId: '',
      isActive: true,
      sortOrder: 0,
    })
    setSelectedCategory(null)
  }

  const parentOptions = categories.filter((c) => c.id !== selectedCategory?.id)

  const filteredCategories = categories
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name, 'en')
    })

  const handleInlineUpdate = async (
    category: Category,
    updates: Partial<Pick<Category, 'isActive' | 'sortOrder'>>
  ) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Failed to update category')

      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id
            ? {
                ...c,
                isActive: data.isActive ?? c.isActive,
                sortOrder: data.sortOrder ?? c.sortOrder,
              }
            : c
        )
      )
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update category',
        variant: 'destructive',
      })
      loadCategories()
    }
  }

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '—'
    const parent = categories.find((c) => c.id === parentId)
    return parent?.name ?? parentId
  }

  const swapSortOrder = async (a: Category, b: Category) => {
    const aOrder = a.sortOrder
    const bOrder = b.sortOrder
    // Optimistic UI
    setCategories((prev) =>
      prev.map((c) => (c.id === a.id ? { ...c, sortOrder: bOrder } : c.id === b.id ? { ...c, sortOrder: aOrder } : c))
    )
    try {
      const [ra, rb] = await Promise.all([
        fetch(`/api/categories/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: bOrder }),
        }),
        fetch(`/api/categories/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: aOrder }),
        }),
      ])
      if (!ra.ok || !rb.ok) throw new Error('Failed to reorder')
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to reorder categories',
        variant: 'destructive',
      })
      loadCategories()
    }
  }

  const moveCategory = async (category: Category, direction: 'up' | 'down') => {
    // Reorder within the same parent group (top-level together, children together under their parentId)
    const group = filteredCategories.filter((c) => (c.parentId ?? null) === (category.parentId ?? null))
    const idx = group.findIndex((c) => c.id === category.id)
    if (idx < 0) return
    const swapWith = direction === 'up' ? group[idx - 1] : group[idx + 1]
    if (!swapWith) return
    await swapSortOrder(category, swapWith)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <FolderTree className="h-8 w-8" />
            Categories
          </h1>
          <p className="mt-1 text-muted-foreground">Manage equipment categories and hierarchy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCategories}>
            <RefreshCw className="me-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant={reorderMode ? 'default' : 'outline'}
            onClick={() => setReorderMode((v) => !v)}
            title="Toggle reorder mode"
          >
            <ListOrdered className="me-2 h-4 w-4" />
            Reorder
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm()
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="me-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
                <DialogDescription>
                  Create a new equipment category. Optionally set a parent for hierarchy.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. كاميرات"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (AR)</Label>
                  <Input
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    placeholder="مثال: كاميرات"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name (EN)</Label>
                    <Input
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="e.g. Cameras"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (ZH)</Label>
                    <Input
                      value={formData.nameZh}
                      onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (FR)</Label>
                    <Input
                      value={formData.nameFr}
                      onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. cameras (auto from name if empty)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent category</Label>
                  <Select
                    value={formData.parentId || 'none'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, parentId: v === 'none' ? '' : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top level)</SelectItem>
                      {parentOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: Number(e.target.value || 0) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="block">Active</Label>
                    <div className="flex h-10 items-center">
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        aria-label="Category active state"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories ({filteredCategories.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Equipment count includes items in this category only.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No categories. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="font-mono text-sm">{category.slug}</TableCell>
                      <TableCell>{getParentName(category.parentId)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-20"
                          value={category.sortOrder}
                          onChange={(e) => {
                            const next = Number(e.target.value || 0)
                            setCategories((prev) =>
                              prev.map((c) => (c.id === category.id ? { ...c, sortOrder: next } : c))
                            )
                          }}
                          onBlur={(e) => {
                            const next = Number(e.target.value || 0)
                            if (next !== category.sortOrder) {
                              void handleInlineUpdate(category, { sortOrder: next })
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={category.isActive}
                          onCheckedChange={(checked) => {
                            setCategories((prev) =>
                              prev.map((c) =>
                                c.id === category.id ? { ...c, isActive: checked } : c
                              )
                            )
                            void handleInlineUpdate(category, { isActive: checked })
                          }}
                          aria-label={`Toggle ${category.name}`}
                        />
                      </TableCell>
                      <TableCell>{category.equipmentCount}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          {reorderMode && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void moveCategory(category, 'up')}
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void moveCategory(category, 'down')}
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update name, slug, parent, or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Name (AR)</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Name (EN)</Label>
                <Input
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name (ZH)</Label>
                <Input
                  value={formData.nameZh}
                  onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name (FR)</Label>
                <Input
                  value={formData.nameFr}
                  onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent category</Label>
              <Select
                value={formData.parentId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, parentId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top level)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: Number(e.target.value || 0) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="block">Active</Label>
                <div className="flex h-10 items-center">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    aria-label="Category active state"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}&quot;?
              {(selectedCategory?.equipmentCount ?? 0) > 0 && (
                <span className="mt-2 block text-destructive">
                  Warning: this category has {selectedCategory?.equipmentCount} equipment item(s).
                  Consider reassigning them first.
                </span>
              )}
              {(selectedCategory?.childrenCount ?? 0) > 0 && (
                <span className="mt-2 block text-destructive">
                  This category has subcategories. Delete or move them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
