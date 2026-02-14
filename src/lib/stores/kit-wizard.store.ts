/**
 * Kit wizard state (Build Your Kit). Step, category, equipment selections, duration.
 * Persisted so progress survives refresh.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type KitWizardStepIndex = 0 | 1 | 2 | 3

export interface KitSelectedItem {
  qty: number
  dailyPrice: number
  model?: string
  imageUrl?: string
}

interface KitWizardState {
  step: KitWizardStepIndex
  selectedCategoryId: string
  /** equipmentId -> { qty, dailyPrice } */
  selectedEquipment: Record<string, KitSelectedItem>
  durationDays: number

  setStep: (step: KitWizardStepIndex) => void
  setCategory: (categoryId: string) => void
  addEquipment: (
    equipmentId: string,
    qty: number,
    dailyPrice: number,
    display?: { model?: string; imageUrl?: string }
  ) => void
  removeEquipment: (equipmentId: string) => void
  setQty: (equipmentId: string, qty: number) => void
  setDuration: (days: number) => void
  reset: () => void
}

const defaultState = {
  step: 0 as KitWizardStepIndex,
  selectedCategoryId: '',
  selectedEquipment: {} as Record<string, KitSelectedItem>,
  durationDays: 1,
}

export const useKitWizardStore = create<KitWizardState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setStep: (step) => set({ step }),

      setCategory: (selectedCategoryId) => set({ selectedCategoryId }),

      addEquipment: (equipmentId, qty, dailyPrice, display) =>
        set((state) => ({
          selectedEquipment: {
            ...state.selectedEquipment,
            [equipmentId]: {
              qty: Math.max(1, qty),
              dailyPrice,
              model: display?.model,
              imageUrl: display?.imageUrl,
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

      reset: () => set(defaultState),
    }),
    {
      name: 'flixcam-kit-wizard',
      partialize: (s) => ({
        step: s.step,
        selectedCategoryId: s.selectedCategoryId,
        selectedEquipment: s.selectedEquipment,
        durationDays: s.durationDays,
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
