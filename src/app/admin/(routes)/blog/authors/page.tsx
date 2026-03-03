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
import type { BlogAuthorAdmin } from '@/lib/types/blog.types'

const PAGE_SIZE = 20
const ROLES = ['WRITER', 'EDITOR', 'ADMIN'] as const

export default function AdminBlogAuthorsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<BlogAuthorAdmin[]>([])
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
    name: '',
    slug: '',
    email: '',
    bioAr: '',
    bioEn: '',
    avatar: '',
    role: '' as string,
    twitterUrl: '',
    linkedinUrl: '',
    instagramUrl: '',
    githubUrl: '',
    websiteUrl: '',
    metaTitle: '',
    metaDescription: '',
    isActive: true,
  })

  const fetchAuthors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (searchDebounced.trim()) params.set('search', searchDebounced.trim())
      const res = await fetch(`/api/admin/blog/authors?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load authors',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced, toast])

  useEffect(() => {
    fetchAuthors()
  }, [fetchAuthors])

  const authorOptions = items.filter((a) => !deleteId || a.id !== deleteId)

  const openCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      slug: '',
      email: '',
      bioAr: '',
      bioEn: '',
      avatar: '',
      role: '',
      twitterUrl: '',
      linkedinUrl: '',
      instagramUrl: '',
      githubUrl: '',
      websiteUrl: '',
      metaTitle: '',
      metaDescription: '',
      isActive: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (author: BlogAuthorAdmin) => {
    setEditingId(author.id)
    setForm({
      name: author.name,
      slug: author.slug ?? '',
      email: author.email ?? '',
      bioAr: author.bioAr ?? '',
      bioEn: author.bioEn ?? '',
      avatar: author.avatar ?? '',
      role: author.role ?? '',
      twitterUrl: author.twitterUrl ?? '',
      linkedinUrl: author.linkedinUrl ?? '',
      instagramUrl: author.instagramUrl ?? '',
      githubUrl: author.githubUrl ?? '',
      websiteUrl: author.websiteUrl ?? '',
      metaTitle: author.metaTitle ?? '',
      metaDescription: author.metaDescription ?? '',
      isActive: author.isActive,
    })
    setDialogOpen(true)
  }

  const handleSlugFromName = () => {
    const base = form.name.trim()
    if (base) setForm((f) => ({ ...f, slug: slugify(base) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        email: form.email || undefined,
        bioAr: form.bioAr || null,
        bioEn: form.bioEn || null,
        avatar: form.avatar || null,
        role: form.role || null,
        twitterUrl: form.twitterUrl || null,
        linkedinUrl: form.linkedinUrl || null,
        instagramUrl: form.instagramUrl || null,
        githubUrl: form.githubUrl || null,
        websiteUrl: form.websiteUrl || null,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        isActive: form.isActive,
      }
      if (editingId) {
        const res = await fetch(`/api/admin/blog/authors/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? err.details ?? 'Update failed')
        }
        toast({ title: 'Success', description: 'Author updated' })
      } else {
        if (!form.email?.trim()) {
          throw new Error('Email is required')
        }
        const res = await fetch('/api/admin/blog/authors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, email: form.email }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? err.details ?? 'Create failed')
        }
        toast({ title: 'Success', description: 'Author created' })
      }
      setDialogOpen(false)
      fetchAuthors()
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
      const url = new URL(`/api/admin/blog/authors/${deleteId}`, window.location.origin)
      if (deleteReassignTo) url.searchParams.set('reassignTo', deleteReassignTo)
      const res = await fetch(url.toString(), { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Delete failed')
      }
      toast({ title: 'Success', description: 'Author deleted' })
      setDeleteId(null)
      setDeleteReassignTo('')
      fetchAuthors()
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

  const authorToDelete = deleteId ? items.find((a) => a.id === deleteId) : null
  const postCount = authorToDelete?._count?.posts ?? 0

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
      <h1 className="text-2xl font-bold">Blog Authors</h1>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by name or email..."
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
              Add Author
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Author' : 'Create Author'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    onBlur={handleSlugFromName}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="auto-generated from name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required={!editingId}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bio (Arabic)</Label>
                  <Textarea
                    value={form.bioAr}
                    onChange={(e) => setForm((f) => ({ ...f, bioAr: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio (English)</Label>
                  <Textarea
                    value={form.bioEn}
                    onChange={(e) => setForm((f) => ({ ...f, bioEn: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex gap-4">
                  {form.avatar && (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border">
                      { }
                      <img
                        src={form.avatar}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <ImageUploader
                      value={form.avatar}
                      onChange={(url) => setForm((f) => ({ ...f, avatar: url }))}
                      label=""
                      placeholder="Upload or paste avatar URL"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, role: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Social Links</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Twitter URL"
                    value={form.twitterUrl}
                    onChange={(e) => setForm((f) => ({ ...f, twitterUrl: e.target.value }))}
                  />
                  <Input
                    placeholder="LinkedIn URL"
                    value={form.linkedinUrl}
                    onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                  />
                  <Input
                    placeholder="Instagram URL"
                    value={form.instagramUrl}
                    onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                  />
                  <Input
                    placeholder="GitHub URL"
                    value={form.githubUrl}
                    onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                  />
                  <Input
                    placeholder="Website URL"
                    value={form.websiteUrl}
                    onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                    className="sm:col-span-2"
                  />
                </div>
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
              <TableHead className="w-14">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Status</TableHead>
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
                  No authors
                </TableCell>
              </TableRow>
            ) : (
              items.map((author) => (
                <TableRow key={author.id}>
                  <TableCell>
                    {author.avatar ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border">
                        { }
                        <img
                          src={author.avatar}
                          alt={author.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{author.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{author.email ?? '—'}</TableCell>
                  <TableCell>{author.role ?? '—'}</TableCell>
                  <TableCell>{author._count?.posts ?? 0}</TableCell>
                  <TableCell>
                    <span className={author.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                      {author.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(author.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(author)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(author.id)}
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
            <AlertDialogTitle>Delete Author</AlertDialogTitle>
            <AlertDialogDescription>
              {postCount > 0 ? (
                <>
                  This author has {postCount} post(s). Reassign them to another author before deleting, or
                  select an author.
                  <div className="mt-4">
                    <Label>Reassign to</Label>
                    <Select value={deleteReassignTo} onValueChange={setDeleteReassignTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select author" />
                      </SelectTrigger>
                      <SelectContent>
                        {authorOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                'Delete this author?'
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
