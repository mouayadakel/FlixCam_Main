'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CrewProfileFormValues = {
  bookingMode: 'cart' | 'quote'
  crewProfileNameEn: string
  crewProfileNameAr: string
  crewProfileBioEn: string
  crewProfileBioAr: string
  crewProfileExperienceYears: string
  crewProfileSpecialties: string
}

interface CrewEquipmentFieldsProps {
  values: CrewProfileFormValues
  onChange: (patch: Partial<CrewProfileFormValues>) => void
}

export function CrewEquipmentFields({ values, onChange }: CrewEquipmentFieldsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">إعدادات الطاقم (Crew)</h3>

      <div className="space-y-2">
        <Label>طريقة الحجز</Label>
        <Select
          value={values.bookingMode}
          onValueChange={(v) => onChange({ bookingMode: v as 'cart' | 'quote' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cart">إضافة للسلة (Cart)</SelectItem>
            <SelectItem value="quote">طلب عرض سعر (Quote)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>اسم العرض (EN)</Label>
          <Input
            value={values.crewProfileNameEn}
            onChange={(e) => onChange({ crewProfileNameEn: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>اسم العرض (AR)</Label>
          <Input
            value={values.crewProfileNameAr}
            onChange={(e) => onChange({ crewProfileNameAr: e.target.value })}
            dir="rtl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>نبذة (EN)</Label>
        <Textarea
          value={values.crewProfileBioEn}
          onChange={(e) => onChange({ crewProfileBioEn: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>نبذة (AR)</Label>
        <Textarea
          value={values.crewProfileBioAr}
          onChange={(e) => onChange({ crewProfileBioAr: e.target.value })}
          rows={3}
          dir="rtl"
        />
      </div>

      <div className="space-y-2">
        <Label>سنوات الخبرة</Label>
        <Input
          type="number"
          min={0}
          max={60}
          value={values.crewProfileExperienceYears}
          onChange={(e) => onChange({ crewProfileExperienceYears: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>التخصصات (مفصولة بفاصلة)</Label>
        <Input
          value={values.crewProfileSpecialties}
          onChange={(e) => onChange({ crewProfileSpecialties: e.target.value })}
          placeholder="Cinema, Commercial, Documentary"
        />
      </div>
    </div>
  )
}

export function crewProfileFromForm(
  values: CrewProfileFormValues
): Record<string, unknown> | undefined {
  const hasProfile =
    values.crewProfileNameEn ||
    values.crewProfileNameAr ||
    values.crewProfileBioEn ||
    values.crewProfileBioAr ||
    values.crewProfileExperienceYears ||
    values.crewProfileSpecialties

  const payload: Record<string, unknown> = {
    itemType: 'crew',
    bookingMode: values.bookingMode,
  }

  if (hasProfile) {
    const years = parseInt(values.crewProfileExperienceYears, 10)
    payload.crewProfile = {
      nameEn: values.crewProfileNameEn || undefined,
      nameAr: values.crewProfileNameAr || undefined,
      bioEn: values.crewProfileBioEn || undefined,
      bioAr: values.crewProfileBioAr || undefined,
      experienceYears: Number.isFinite(years) ? years : undefined,
      specialties: values.crewProfileSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
  }

  return payload
}

export function crewProfileToForm(customFields: Record<string, unknown> | null | undefined): CrewProfileFormValues {
  const cf = customFields ?? {}
  const profile = (cf.crewProfile as Record<string, unknown>) ?? {}
  const specialties = Array.isArray(profile.specialties)
    ? (profile.specialties as string[]).join(', ')
    : ''

  return {
    bookingMode: cf.bookingMode === 'quote' ? 'quote' : 'cart',
    crewProfileNameEn: String(profile.nameEn ?? ''),
    crewProfileNameAr: String(profile.nameAr ?? ''),
    crewProfileBioEn: String(profile.bioEn ?? ''),
    crewProfileBioAr: String(profile.bioAr ?? ''),
    crewProfileExperienceYears:
      profile.experienceYears != null ? String(profile.experienceYears) : '',
    crewProfileSpecialties: specialties,
  }
}
