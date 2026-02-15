/**
 * Kit wizard state (Build Your Kit). Smart flow: shoot type → budget → questionnaire → categories → duration → summary.
 * Persisted so progress survives refresh.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type KitWizardPhase =
  | 'shoot-type'
  | 'budget'
  | 'questionnaire'
  | 'categories'
  | 'duration'
  | 'summary'

export type KitWizardView = 'setup' | 'building' | 'review'

export type BudgetTier = 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM'

export interface CategoryStepConfig {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  sortOrder: number
  isRequired: boolean
  minRecommended: number | null
  maxRecommended: number | null
  stepTitle: string | null
  stepTitleAr: string | null
  stepDescription: string | null
  stepDescriptionAr: string | null
}

export interface ShootTypeFullConfig {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
  questionnaire: unknown
  categorySteps: CategoryStepConfig[]
  recommendations: unknown[]
}

export type KitWizardStepIndex = 0 | 1 | 2 | 3

export interface KitSelectedItem {
  qty: number
  dailyPrice: number
  model?: string
  imageUrl?: string
  categoryId?: string
  isRecommended?: boolean
  budgetTier?: BudgetTier
}

export interface EquipmentRecommendationItem {
  equipmentId: string
  equipmentName: string
  sku: string
  quantity: number
  dailyPrice: number
  role: string
  reason: string
}

interface KitWizardState {
  phase: KitWizardPhase
  step: KitWizardStepIndex
  view: KitWizardView

  shootTypeId: string | null
  shootTypeSlug: string | null
  shootTypeData: ShootTypeFullConfig | null
  budgetTier: BudgetTier | null
  answers: Record<string, string | string[]>
  categorySteps: CategoryStepConfig[]
  currentCategoryIndex: number
  skippedCategories: string[]
  selectedCategoryId: string
  selectedEquipment: Record<string, KitSelectedItem>
  durationDays: number
  aiSuggestions: EquipmentRecommendationItem[] | null
  showAiAssistant: boolean

  activeCategory: string | null
  searchQuery: string
  sortBy: string
  startDate: string | null
  endDate: string | null

  setPhase: (phase: KitWizardPhase) => void
  setView: (view: KitWizardView) => void
  toggleAiAssistant: () => void
  setStep: (step: KitWizardStepIndex) => void
  setShootType: (id: string, slug: string) => void
  setShootTypeData: (data: ShootTypeFullConfig | null) => void
  setBudgetTier: (tier: BudgetTier | null) => void
  setAnswer: (questionId: string, value: string | string[]) => void
  setCategorySteps: (steps: CategoryStepConfig[]) => void
  nextCategory: () => void
  prevCategory: () => void
  skipCategory: (categoryId: string) => void
  setCategory: (categoryId: string) => void
  setActiveCategory: (categoryId: string | null) => void
  setSearchQuery: (q: string) => void
  setSortBy: (sort: string) => void
  setDates: (start: string | null, end: string | null) => void
  addEquipment: (
    equipmentId: string,
    qty: number,
    dailyPrice: number,
    display?: { model?: string; imageUrl?: string; categoryId?: string; isRecommended?: boolean; budgetTier?: BudgetTier }
  ) => void
  removeEquipment: (equipmentId: string) => void
  setQty: (equipmentId: string, qty: number) => void
  setDuration: (days: number) => void
  setAiSuggestions: (suggestions: EquipmentRecommendationItem[] | null) => void
  reset: () => void
}

const defaultState = {
  phase: 'shoot-type' as KitWizardPhase,
  step: 0 as KitWizardStepIndex,
  view: 'setup' as KitWizardView,
  shootTypeId: null as string | null,
  shootTypeSlug: null as string | null,
  shootTypeData: null as ShootTypeFullConfig | null,
  budgetTier: null as BudgetTier | null,
  answers: {} as Record<string, string | string[]>,
  categorySteps: [] as CategoryStepConfig[],
  currentCategoryIndex: 0,
  skippedCategories: [] as string[],
  selectedCategoryId: '',
  selectedEquipment: {} as Record<string, KitSelectedItem>,
  durationDays: 1,
  aiSuggestions: null as EquipmentRecommendationItem[] | null,
  showAiAssistant: false,
  activeCategory: null as string | null,
  searchQuery: '',
  sortBy: 'recommended',
  startDate: null as string | null,
  endDate: null as string | null,
}

export const useKitWizardStore = create<KitWizardState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setPhase: (phase) => set({ phase }),
      setView: (view) => set({ view }),
      setStep: (step) => set({ step }),

      setShootType: (id, slug) => set({ shootTypeId: id, shootTypeSlug: slug }),
      setShootTypeData: (data) => set({ shootTypeData: data, categorySteps: data?.categorySteps ?? [] }),
      setBudgetTier: (budgetTier) => set({ budgetTier }),
      setAnswer: (questionId, value) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: value } })),
      setCategorySteps: (categorySteps) => set({ categorySteps, currentCategoryIndex: 0 }),
      nextCategory: () =>
        set((state) => ({
          currentCategoryIndex: Math.min(state.currentCategoryIndex + 1, state.categorySteps.length - 1),
          selectedCategoryId: state.categorySteps[state.currentCategoryIndex + 1]?.categoryId ?? '',
        })),
      prevCategory: () =>
        set((state) => {
          const next = Math.max(0, state.currentCategoryIndex - 1)
          return {
            currentCategoryIndex: next,
            selectedCategoryId: state.categorySteps[next]?.categoryId ?? '',
          }
        }),
      skipCategory: (categoryId) =>
        set((state) => ({
          skippedCategories: state.skippedCategories.includes(categoryId) ? state.skippedCategories : [...state.skippedCategories, categoryId],
          currentCategoryIndex: Math.min(state.currentCategoryIndex + 1, state.categorySteps.length - 1),
          selectedCategoryId: state.categorySteps[state.currentCategoryIndex + 1]?.categoryId ?? '',
        })),
      setCategory: (selectedCategoryId) => set({ selectedCategoryId }),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSortBy: (sortBy) => set({ sortBy }),
      setDates: (startDate, endDate) =>
        set((state) => {
          const start = startDate ? new Date(startDate) : null
          const end = endDate ? new Date(endDate) : null
          const durationDays =
            start && end && end > start
              ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
              : state.durationDays
          return { startDate, endDate, durationDays }
        }),

      addEquipment: (equipmentId, qty, dailyPrice, display) =>
        set((state) => ({
          selectedEquipment: {
            ...state.selectedEquipment,
            [equipmentId]: {
              qty: Math.max(1, qty),
              dailyPrice,
              model: display?.model,
              imageUrl: display?.imageUrl,
              categoryId: display?.categoryId,
              isRecommended: display?.isRecommended,
              budgetTier: display?.budgetTier,
            },
          },
        })),

      removeEquipment: (equipmentId) =>
        set((state) => {
          const next = { ...state.selectedEquipment }
          delete next[equipmentId]
          return { selectedEquipment: next }
        }),

      setQty: (equipmentId, qty) =>
        set((state) => {
          if (qty < 1) {
            const next = { ...state.selectedEquipment }
            delete next[equipmentId]
            return { selectedEquipment: next }
          }
          const existing = state.selectedEquipment[equipmentId]
          if (!existing) return state
          return {
            selectedEquipment: {
              ...state.selectedEquipment,
              [equipmentId]: { ...existing, qty },
            },
          }
        }),

      setDuration: (durationDays) =>
        set({ durationDays: Math.min(365, Math.max(1, durationDays)) }),
      setAiSuggestions: (aiSuggestions) => set({ aiSuggestions }),
      toggleAiAssistant: () => set((s) => ({ showAiAssistant: !s.showAiAssistant })),
      reset: () => set(defaultState),
    }),
    {
      name: 'flixcam-kit-wizard',
      partialize: (s) => ({
        phase: s.phase,
        step: s.step,
        view: s.view,
        shootTypeId: s.shootTypeId,
        shootTypeSlug: s.shootTypeSlug,
        budgetTier: s.budgetTier,
        answers: s.answers,
        categorySteps: s.categorySteps,
        currentCategoryIndex: s.currentCategoryIndex,
        skippedCategories: s.skippedCategories,
        selectedCategoryId: s.selectedCategoryId,
        selectedEquipment: s.selectedEquipment,
        durationDays: s.durationDays,
        activeCategory: s.activeCategory,
        searchQuery: s.searchQuery,
        sortBy: s.sortBy,
        startDate: s.startDate,
        endDate: s.endDate,
      }),
    }
  )
)

/** Total daily rate from all selected equipment */
export function getKitWizardTotalDaily(state: {
  selectedEquipment: Record<string, KitSelectedItem>
}): number {
  return Object.values(state.selectedEquipment).reduce(
    (sum, { qty, dailyPrice }) => sum + qty * dailyPrice,
    0
  )
}

/** Total amount for current duration */
export function getKitWizardTotalAmount(state: {
  selectedEquipment: Record<string, KitSelectedItem>
  durationDays: number
}): number {
  const daily = getKitWizardTotalDaily(state)
  return daily * state.durationDays
}

/** Number of selected equipment entries (count of items, not units) */
export function getKitWizardSelectedCount(state: {
  selectedEquipment: Record<string, KitSelectedItem>
}): number {
  return Object.keys(state.selectedEquipment).length
}

/** Total units (sum of qty) */
export function getKitWizardTotalUnits(state: {
  selectedEquipment: Record<string, KitSelectedItem>
}): number {
  return Object.values(state.selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)
}

/** Current category step config (when in categories phase) */
export function getCurrentCategoryStep(state: {
  categorySteps: CategoryStepConfig[]
  currentCategoryIndex: number
}): CategoryStepConfig | null {
  return state.categorySteps[state.currentCategoryIndex] ?? null
}

/** Selected equipment grouped by categoryId */
export function getSelectedByCategory(state: {
  selectedEquipment: Record<string, KitSelectedItem>
}): Map<string, [string, KitSelectedItem][]> {
  const byCategory = new Map<string, [string, KitSelectedItem][]>()
  for (const [id, item] of Object.entries(state.selectedEquipment)) {
    const catId = item.categoryId ?? 'other'
    if (!byCategory.has(catId)) byCategory.set(catId, [])
    byCategory.get(catId)!.push([id, item])
  }
  return byCategory
}

/** Category IDs that have at least one selected item */
function getSelectedCategoryIds(state: {
  selectedEquipment: Record<string, KitSelectedItem>
}): Set<string> {
  const ids = new Set<string>()
  for (const item of Object.values(state.selectedEquipment)) {
    if (item.categoryId) ids.add(item.categoryId)
  }
  return ids
}

/** Category steps that have no selected equipment (missing essentials) */
export function getMissingCategories(state: {
  categorySteps: CategoryStepConfig[]
  selectedEquipment: Record<string, KitSelectedItem>
}): CategoryStepConfig[] {
  const selectedIds = getSelectedCategoryIds(state)
  return state.categorySteps.filter((step) => !selectedIds.has(step.categoryId))
}
