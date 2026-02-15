/**
 * TanStack Query hooks for Build Your Kit APIs.
 * Caching, deduplication, and infinite pagination for equipment.
 */

'use client'

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type { CategoryStepConfig, ShootTypeFullConfig } from '@/lib/stores/kit-wizard.store'
import type { BudgetTier } from '@/lib/stores/kit-wizard.store'

const STALE_TIME = 10 * 60 * 1000 // 10 min for shoot types
const EQUIPMENT_PAGE_SIZE = 24

// --- Shoot types list ---
export interface ShootTypeListItem {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  icon: string | null
  coverImageUrl: string | null
  categoryCount: number
  recommendationCount: number
}

async function fetchShootTypes(): Promise<ShootTypeListItem[]> {
  const res = await fetch('/api/public/shoot-types')
  if (!res.ok) throw new Error('Failed to fetch shoot types')
  const json = await res.json()
  return Array.isArray(json?.data) ? json.data : []
}

export function useShootTypes() {
  return useQuery({
    queryKey: ['shoot-types'],
    queryFn: fetchShootTypes,
    staleTime: STALE_TIME,
  })
}

// --- Shoot type config by slug ---
async function fetchShootTypeConfig(slug: string): Promise<ShootTypeFullConfig> {
  const res = await fetch(`/api/public/shoot-types/${slug}`)
  if (!res.ok) throw new Error('Failed to fetch shoot type config')
  return res.json()
}

export function useShootTypeConfig(slug: string | null) {
  return useQuery({
    queryKey: ['shoot-type-config', slug],
    queryFn: () => fetchShootTypeConfig(slug!),
    enabled: !!slug,
    staleTime: STALE_TIME,
  })
}

// --- Equipment list (paginated) ---
export interface EquipmentFilters {
  categoryId?: string | null
  budgetTier?: BudgetTier | null
  q?: string
  sort?: string
}

export interface EquipmentListItem {
  id: string
  sku: string
  model: string | null
  categoryId: string
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
  featured: boolean
  quantityAvailable: number
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string }
  media: { id: string; url: string; type: string }[]
}

async function fetchEquipmentPage(params: {
  categoryId?: string | null
  budgetTier?: string | null
  q?: string
  sort?: string
  skip: number
  take: number
}): Promise<{ data: EquipmentListItem[]; total: number }> {
  const search = new URLSearchParams()
  if (params.categoryId) search.set('categoryId', params.categoryId)
  if (params.budgetTier) search.set('budgetTier', params.budgetTier)
  if (params.q) search.set('q', params.q)
  search.set('sort', params.sort ?? 'recommended')
  search.set('skip', String(params.skip))
  search.set('take', String(params.take))
  const res = await fetch(`/api/public/equipment?${search.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch equipment')
  const json = await res.json()
  return {
    data: Array.isArray(json?.data) ? json.data : [],
    total: typeof json?.total === 'number' ? json.total : 0,
  }
}

export function useEquipmentInfinite(
  filters: EquipmentFilters & { categoryId: string | null }
) {
  const { categoryId, budgetTier, q, sort } = filters
  return useInfiniteQuery({
    queryKey: ['equipment', 'infinite', categoryId, budgetTier ?? '', q ?? '', sort ?? 'recommended'],
    queryFn: ({ pageParam }) =>
      fetchEquipmentPage({
        categoryId: categoryId || undefined,
        budgetTier: budgetTier ?? undefined,
        q: q || undefined,
        sort: sort || undefined,
        skip: pageParam as number,
        take: EQUIPMENT_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.length * EQUIPMENT_PAGE_SIZE
      if (lastPage.data.length < EQUIPMENT_PAGE_SIZE || loaded >= lastPage.total)
        return undefined
      return loaded
    },
    staleTime: 5 * 60 * 1000,
  })
}

// --- Kit compatibility (POST) ---
export interface CompatibleEquipmentItem {
  id: string
  sku: string
  model: string | null
  dailyPrice: number
  category: { name: string; slug: string }
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
  matchingCameraModels?: string[]
}

async function fetchKitCompatibility(
  selectedEquipmentIds: string[],
  targetCategoryId: string
): Promise<CompatibleEquipmentItem[]> {
  const res = await fetch('/api/public/kit-compatibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedEquipmentIds, targetCategoryId }),
  })
  if (!res.ok) throw new Error('Failed to fetch compatibility')
  const json = await res.json()
  return Array.isArray(json?.data) ? json.data : []
}

export function useKitCompatibility(
  selectedEquipmentIds: string[],
  targetCategoryId: string | null
) {
  return useQuery({
    queryKey: ['kit-compatibility', selectedEquipmentIds.join(','), targetCategoryId],
    queryFn: () => fetchKitCompatibility(selectedEquipmentIds, targetCategoryId!),
    enabled: targetCategoryId != null && targetCategoryId.length > 0,
    staleTime: 2 * 60 * 1000,
  })
}

// --- Kit AI suggest (POST) ---
export interface KitAISuggestParams {
  shootTypeId?: string | null
  shootTypeSlug?: string | null
  budgetTier?: BudgetTier | null
  questionnaireAnswers?: Record<string, string | string[]>
  currentSelections: string[]
  duration: number
}

export interface KitAISuggestSuggestion {
  equipmentId: string
  equipmentName: string
  sku: string
  quantity: number
  dailyPrice: number
  role: string
  reason: string
}

export interface PrebuiltKitMatch {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: number | null
  itemCount: number
  totalDaily: number
  totalWithDiscount: number
  savingsPercent: number
  equipmentIds: string[]
}

export interface KitAISuggestResult {
  suggestions: KitAISuggestSuggestion[]
  matchingPrebuiltKits: PrebuiltKitMatch[]
}

async function fetchKitAISuggest(params: KitAISuggestParams): Promise<KitAISuggestResult> {
  const res = await fetch('/api/public/kit-ai-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shootTypeId: params.shootTypeId ?? undefined,
      shootTypeSlug: params.shootTypeSlug ?? undefined,
      budgetTier: params.budgetTier ?? undefined,
      questionnaireAnswers: params.questionnaireAnswers,
      currentSelections: params.currentSelections,
      duration: params.duration,
    }),
  })
  if (!res.ok) throw new Error('Failed to fetch AI suggestions')
  const json = await res.json()
  return {
    suggestions: Array.isArray(json?.suggestions) ? json.suggestions : [],
    matchingPrebuiltKits: Array.isArray(json?.matchingPrebuiltKits) ? json.matchingPrebuiltKits : [],
  }
}

export function useKitAISuggest(params: KitAISuggestParams | null) {
  return useQuery({
    queryKey: [
      'kit-ai-suggest',
      params?.shootTypeId ?? '',
      params?.shootTypeSlug ?? '',
      params?.budgetTier ?? '',
      params?.currentSelections?.join(',') ?? '',
      params?.duration ?? 7,
    ],
    queryFn: () => fetchKitAISuggest(params!),
    enabled: params != null && params.duration >= 1,
    staleTime: 2 * 60 * 1000,
  })
}

// --- Equipment availability (date range) ---
export interface EquipmentAvailabilityResult {
  available: boolean
  quantityAvailable: number
}

async function fetchEquipmentAvailability(
  equipmentId: string,
  startDate: string,
  endDate: string
): Promise<EquipmentAvailabilityResult> {
  const params = new URLSearchParams({ startDate, endDate })
  const res = await fetch(`/api/public/equipment/${equipmentId}/availability?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch availability')
  return res.json()
}

export function useEquipmentAvailability(
  equipmentId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  return useQuery({
    queryKey: ['equipment-availability', equipmentId, startDate, endDate],
    queryFn: () => fetchEquipmentAvailability(equipmentId!, startDate!, endDate!),
    enabled: !!equipmentId && !!startDate && !!endDate,
    staleTime: 60 * 1000,
  })
}
