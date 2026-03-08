'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ArrowRight, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TablePagination } from '@/components/tables/table-pagination'
import { ImageUploader } from '@/components/admin/blog/image-uploader'
import { slugify } from '@/lib/utils'
import type { BlogCategoryAdmin } from '@/lib/types/blog.types'

const PAGE_SIZE = 20

export default function AdminBlogCategoriesPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<BlogCategoryAdmin[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteReassignTo, setDeleteReassignTo] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    slug: '',
    descriptionAr: '',
    descriptionEn: '',
    parentCategoryId: '' as string,
    coverImage: '',
    metaTitle: '',
    metaDescription: '',
    sortOrder: 0,
    isActive: true,
  })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (searchDebounced.trim()) params.set('search', searchDebounced.trim())
      const res = await fetch(`/api/admin/blog/categories?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load categories',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced, toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const parentOptions = items.filter((c) => !editingId || c.id !== editingId)

  const openCreate = () => {
    setEditingId(null)
    setForm({
      nameAr: '',
      nameEn: '',
      slug: '',
      descriptionAr: '',
      descriptionEn: '',
      parentCategoryId: '',
      coverImage: '',
      metaTitle: '',
      metaDescription: '',
      sortOrder: 0,
      isActive: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (cat: BlogCategoryAdmin) => {
    setEditingId(cat.id)
    setForm({
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      slug: cat.slug,
      descriptionAr: cat.descriptionAr ?? '',
      descriptionEn: cat.descriptionEn ?? '',
      parentCategoryId: cat.parentCategoryId ?? '',
      coverImage: cat.coverImage ?? '',
      metaTitle: cat.metaTitle ?? '',
      metaDescription: cat.metaDescription ?? '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    })
    setDialogOpen(true)
  }

  const handleSlugFromName = () => {
    const base = form.nameEn.trim() || form.nameAr.trim()
    if (base) setForm((f) => ({ ...f, slug: slugify(base) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        parentCategoryId: form.parentCategoryId || null,
        descriptionAr: form.descriptionAr || null,
        descriptionEn: form.descriptionEn || null,
        coverImage: form.coverImage || null,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
      }
      if (editingId) {
        const res = await fetch(`/api/admin/blog/categories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? err.details ?? 'Update failed')
        }
        toast({ title: 'Success', description: 'Category updated' })
      } else {
        const res = await fetch('/api/admin/blog/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? err.details ?? 'Create failed')
        }
        toast({ title: 'Success', description: 'Category created' })
      }
      setDialogOpen(false)
      fetchCategories()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const url = new URL(`/api/admin/blog/categories/${deleteId}`, window.location.origin)
      if (deleteReassignTo) url.searchParams.set('reassignTo', deleteReassignTo)
      const res = await fetch(url.toString(), { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Delete failed')
      }
      toast({ title: 'Success', description: 'Category deleted' })
      setDeleteId(null)
      setDeleteReassignTo('')
      fetchCategories()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Delete failed',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const catToDelete = deleteId ? items.find((c) => c.id === deleteId) : null
  const postCount = catToDelete?._count?.posts ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/blog">
              <ArrowRight className="me-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>
      <h1 className="text-2xl font-bold">Blog Categories</h1>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="me-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Category' : 'Create Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name (Arabic) *</Label>
                  <Input
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    onBlur={handleSlugFromName}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (English) *</Label>
                  <Input
                    value={form.nameEn}
                    onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                    onBlur={handleSlugFromName}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Description (Arabic)</Label>
                  <Textarea
                    value={form.descriptionAr}
                    onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (English)</Label>
                  <Textarea
                    value={form.descriptionEn}
                    onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parent Category</Label>
                <Select
                  value={form.parentCategoryId || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, parentCategoryId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <ImageUploader
                  value={form.coverImage}
                  onChange={(url) => setForm((f) => ({ ...f, coverImage: url }))}
                  label=""
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input
                    value={form.metaTitle}
                    onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
                    maxLength={70}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                  maxLength={160}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label>Active</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No categories
                </TableCell>
              </TableRow>
            ) : (
              items.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cat.nameEn}</div>
                      <div className="text-xs text-muted-foreground">{cat.nameAr}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{cat.slug}</TableCell>
                  <TableCell>{cat.parent?.nameEn ?? '—'}</TableCell>
                  <TableCell>{cat._count?.posts ?? 0}</TableCell>
                  <TableCell>
                    <span className={cat.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>{cat.sortOrder}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => !deleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {postCount > 0 ? (
                <>
                  This category has {postCount} post(s). Reassign them to another category before deleting, or
                  select a category.
                  <div className="mt-4">
                    <Label>Reassign to</Label>
                    <Select value={deleteReassignTo} onValueChange={setDeleteReassignTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.filter((c) => c.id !== deleteId).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                'Delete this category?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting || (postCount > 0 && !deleteReassignTo)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
