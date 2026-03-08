'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Smartphone, Monitor } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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
import { SectionCard, type CheckoutFormSectionRecord } from './_components/section-card'
import { SectionEditor, type SectionFormData } from './_components/section-editor'
import { FieldEditor, type FieldFormData } from './_components/field-editor'
import { FormPreview } from './_components/form-preview'

export default function CheckoutFormPage() {
  const { toast } = useToast()
  const [sections, setSections] = useState<CheckoutFormSectionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stepTab, setStepTab] = useState('1')
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ar'>('en')
  const [previewMobile, setPreviewMobile] = useState(false)
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false)
  const [sectionEditorInitial, setSectionEditorInitial] = useState<SectionFormData | null>(null)
  const [sectionEditorId, setSectionEditorId] = useState<string | null>(null)
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false)
  const [fieldEditorInitial, setFieldEditorInitial] = useState<FieldFormData | null>(null)
  const [fieldEditorId, setFieldEditorId] = useState<string | null>(null)
  const [addFieldSectionId, setAddFieldSectionId] = useState<string | null>(null)
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null)
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null)
  const [deleteFieldSystem, setDeleteFieldSystem] = useState(false)

  async function fetchSections() {
    try {
      const res = await fetch('/api/admin/cms/checkout-form')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = (json.error as string) || `Failed to load (${res.status})`
        throw new Error(msg)
      }
      setSections(json.sections ?? [])
    } catch (e) {
      setSections([])
      const message = e instanceof Error ? e.message : 'Failed to load form config'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSections()
  }, [])

  const sectionsForStep = sections.filter((s) => s.step === parseInt(stepTab, 10))
  const allFieldKeys = sections.flatMap((s) => (s.fields || []).map((f) => f.fieldKey))

  const handleSaveSection = () => {
    fetchSections()
    setSectionEditorOpen(false)
    setSectionEditorId(null)
    setSectionEditorInitial(null)
    toast({ title: 'Saved', description: 'Section updated' })
  }

  const handleAddSection = () => {
    setSectionEditorId(null)
    setSectionEditorInitial({
      nameEn: '',
      nameAr: '',
      step: parseInt(stepTab, 10),
      sortOrder: sectionsForStep.length,
      isActive: true,
    })
    setSectionEditorOpen(true)
  }

  const handleDeleteSection = async () => {
    if (!deleteSectionId) return
    try {
      const res = await fetch('/api/admin/cms/checkout-form', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'section', id: deleteSectionId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      toast({ title: 'Deleted', description: 'Section removed' })
      setDeleteSectionId(null)
      fetchSections()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Delete failed',
        variant: 'destructive',
      })
    }
  }

  const handleEditField = (data: FieldFormData, fieldId: string) => {
    setFieldEditorId(fieldId)
    setFieldEditorInitial(data)
    setAddFieldSectionId(data.sectionId)
    setFieldEditorOpen(true)
  }

  const handleAddField = (sectionId: string) => {
    setAddFieldSectionId(sectionId)
    setFieldEditorId(null)
    setFieldEditorInitial({
      sectionId,
      fieldKey: '',
      labelEn: '',
      labelAr: '',
      fieldType: 'text',
      isRequired: false,
      isActive: true,
      sortOrder: 0,
    })
    setFieldEditorOpen(true)
  }

  const handleSaveField = () => {
    fetchSections()
    setFieldEditorOpen(false)
    setFieldEditorId(null)
    setFieldEditorInitial(null)
    setAddFieldSectionId(null)
    toast({ title: 'Saved', description: 'Field saved' })
  }

  const handleDeleteField = async () => {
    if (!deleteFieldId || deleteFieldSystem) return
    try {
      const res = await fetch('/api/admin/cms/checkout-form', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'field', id: deleteFieldId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      toast({ title: 'Deleted', description: 'Field removed' })
      setDeleteFieldId(null)
      fetchSections()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Delete failed',
        variant: 'destructive',
      })
    }
  }

  const handleMoveField = async (fieldId: string, direction: 'up' | 'down') => {
    const section = sections.find((s) => s.fields?.some((f) => f.id === fieldId))
    if (!section?.fields?.length) return
    const idx = section.fields.findIndex((f) => f.id === fieldId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= section.fields.length) return
    const reordered = [...section.fields]
    const [removed] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, removed)
    try {
      for (let i = 0; i < reordered.length; i++) {
        await fetch('/api/admin/cms/checkout-form', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'field',
            id: reordered[i].id,
            sortOrder: i,
          }),
        })
      }
      toast({ title: 'Reordered' })
      fetchSections()
    } catch {
      toast({ title: 'Error', description: 'Reorder failed', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">Checkout Form (صفحه التسجيل)</h1>
        <p className="text-muted-foreground">
          Configure sections and fields for the 3-step checkout. System sections/fields can be
          edited but not deleted.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="min-w-0 lg:col-span-1">
          <CardHeader>
            <CardTitle>Form builder</CardTitle>
            <CardDescription>Add and edit sections and fields per step.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Tabs value={stepTab} onValueChange={setStepTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="1">Step 1</TabsTrigger>
                <TabsTrigger value="2">Step 2</TabsTrigger>
                <TabsTrigger value="3">Step 3</TabsTrigger>
              </TabsList>
              <TabsContent value="1" className="space-y-4 pt-4">
                {sectionsForStep.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    allFieldKeys={allFieldKeys}
                    onEditSection={(data) => {
                      setSectionEditorId(section.id)
                      setSectionEditorInitial(data)
                      setSectionEditorOpen(true)
                    }}
                    onDeleteSection={() => setDeleteSectionId(section.id)}
                    onAddField={() => handleAddField(section.id)}
                    onEditField={handleEditField}
                    onDeleteField={(id, isSystem) => {
                      setDeleteFieldId(id)
                      setDeleteFieldSystem(isSystem)
                    }}
                    onMoveField={handleMoveField}
                  />
                ))}
                <Button type="button" variant="outline" onClick={handleAddSection}>
                  <Plus className="h-4 w-4" /> Add section
                </Button>
              </TabsContent>
              <TabsContent value="2" className="space-y-4 pt-4">
                {sectionsForStep.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    allFieldKeys={allFieldKeys}
                    onEditSection={(data) => {
                      setSectionEditorId(section.id)
                      setSectionEditorInitial(data)
                      setSectionEditorOpen(true)
                    }}
                    onDeleteSection={() => setDeleteSectionId(section.id)}
                    onAddField={() => handleAddField(section.id)}
                    onEditField={handleEditField}
                    onDeleteField={(id, isSystem) => {
                      setDeleteFieldId(id)
                      setDeleteFieldSystem(isSystem)
                    }}
                    onMoveField={handleMoveField}
                  />
                ))}
                <Button type="button" variant="outline" onClick={handleAddSection}>
                  <Plus className="h-4 w-4" /> Add section
                </Button>
              </TabsContent>
              <TabsContent value="3" className="space-y-4 pt-4">
                {sectionsForStep.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    allFieldKeys={allFieldKeys}
                    onEditSection={(data) => {
                      setSectionEditorId(section.id)
                      setSectionEditorInitial(data)
                      setSectionEditorOpen(true)
                    }}
                    onDeleteSection={() => setDeleteSectionId(section.id)}
                    onAddField={() => handleAddField(section.id)}
                    onEditField={handleEditField}
                    onDeleteField={(id, isSystem) => {
                      setDeleteFieldId(id)
                      setDeleteFieldSystem(isSystem)
                    }}
                    onMoveField={handleMoveField}
                  />
                ))}
                <Button type="button" variant="outline" onClick={handleAddSection}>
                  <Plus className="h-4 w-4" /> Add section
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="min-w-0 shrink-0 lg:col-span-1 lg:max-w-[340px]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>Live preview</CardTitle>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={previewLocale === 'en' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewLocale('en')}
              >
                EN
              </Button>
              <Button
                type="button"
                variant={previewLocale === 'ar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewLocale('ar')}
              >
                AR
              </Button>
              <Button
                type="button"
                variant={previewMobile ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setPreviewMobile((m) => !m)}
                title={previewMobile ? 'Desktop view' : 'Mobile view'}
              >
                {previewMobile ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <div
              className={`min-w-0 ${previewMobile ? 'max-w-[320px]' : ''}`}
              dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}
            >
              <FormPreview
                sections={sections}
                step={parseInt(stepTab, 10)}
                locale={previewLocale}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <SectionEditor
        open={sectionEditorOpen}
        onOpenChange={setSectionEditorOpen}
        initialData={sectionEditorInitial}
        sectionId={sectionEditorId}
        onSaved={handleSaveSection}
      />

      {addFieldSectionId && (
        <FieldEditor
          open={fieldEditorOpen}
          onOpenChange={setFieldEditorOpen}
          initialData={fieldEditorInitial}
          fieldId={fieldEditorId}
          sectionId={addFieldSectionId}
          allFieldKeys={allFieldKeys}
          onSaved={handleSaveField}
        />
      )}

      <AlertDialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the section and all its fields. System sections cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFieldId && !deleteFieldSystem} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the field. System fields cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
