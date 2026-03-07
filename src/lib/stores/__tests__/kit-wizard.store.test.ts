/**
 * Unit tests for kit-wizard.store
 */

import {
  useKitWizardStore,
  getKitWizardTotalDaily,
  getKitWizardTotalAmount,
  getKitWizardSelectedCount,
  getKitWizardTotalUnits,
  getCurrentCategoryStep,
  getSelectedByCategory,
  getMissingCategories,
} from '../kit-wizard.store'

describe('kit-wizard.store', () => {
  beforeEach(() => {
    useKitWizardStore.getState().reset()
  })

  describe('initial state', () => {
    it('has default phase shoot-type', () => {
      expect(useKitWizardStore.getState().phase).toBe('shoot-type')
    })
    it('has step 0', () => {
      expect(useKitWizardStore.getState().step).toBe(0)
    })
    it('has empty selectedEquipment', () => {
      expect(useKitWizardStore.getState().selectedEquipment).toEqual({})
    })
  })

  describe('setPhase', () => {
    it('updates phase', () => {
      useKitWizardStore.getState().setPhase('budget')
      expect(useKitWizardStore.getState().phase).toBe('budget')
    })
  })

  describe('setView', () => {
    it('updates view', () => {
      useKitWizardStore.getState().setView('building')
      expect(useKitWizardStore.getState().view).toBe('building')
    })
  })

  describe('setStep', () => {
    it('updates step', () => {
      useKitWizardStore.getState().setStep(2)
      expect(useKitWizardStore.getState().step).toBe(2)
    })
  })

  describe('setShootType', () => {
    it('sets shootTypeId and shootTypeSlug', () => {
      useKitWizardStore.getState().setShootType('st_1', 'commercial')
      expect(useKitWizardStore.getState().shootTypeId).toBe('st_1')
      expect(useKitWizardStore.getState().shootTypeSlug).toBe('commercial')
    })
  })

  describe('setShootTypeData', () => {
    it('sets shootTypeData and categorySteps', () => {
      const data = {
        id: 'st_1',
        name: 'Commercial',
        slug: 'commercial',
        description: null,
        nameAr: null,
        nameZh: null,
        icon: null,
        coverImageUrl: null,
        sortOrder: 0,
        isActive: true,
        questionnaire: {},
        categorySteps: [
          {
            id: 'cs1',
            categoryId: 'cat_1',
            categoryName: 'Cameras',
            categorySlug: 'cameras',
            sortOrder: 0,
            isRequired: true,
            minRecommended: 1,
            maxRecommended: 3,
            stepTitle: null,
            stepTitleAr: null,
            stepDescription: null,
            stepDescriptionAr: null,
          },
        ],
        recommendations: [],
      }
      useKitWizardStore.getState().setShootTypeData(data)
      expect(useKitWizardStore.getState().shootTypeData).toEqual(data)
      expect(useKitWizardStore.getState().categorySteps).toHaveLength(1)
    })
    it('clears categorySteps when data is null', () => {
      useKitWizardStore.getState().setShootTypeData({
        id: 'st_1',
        name: 'X',
        slug: 'x',
        description: null,
        nameAr: null,
        nameZh: null,
        icon: null,
        coverImageUrl: null,
        sortOrder: 0,
        isActive: true,
        questionnaire: {},
        categorySteps: [],
        recommendations: [],
      })
      useKitWizardStore.getState().setShootTypeData(null)
      expect(useKitWizardStore.getState().categorySteps).toEqual([])
    })
  })

  describe('setBudgetTier', () => {
    it('sets budgetTier', () => {
      useKitWizardStore.getState().setBudgetTier('PROFESSIONAL')
      expect(useKitWizardStore.getState().budgetTier).toBe('PROFESSIONAL')
    })
  })

  describe('setAnswer', () => {
    it('stores answer', () => {
      useKitWizardStore.getState().setAnswer('q1', 'answer')
      expect(useKitWizardStore.getState().answers).toEqual({ q1: 'answer' })
    })
  })

  describe('addEquipment', () => {
    it('adds equipment', () => {
      useKitWizardStore.getState().addEquipment('eq_1', 2, 100, {
        model: 'Sony FX6',
        categoryId: 'cat_1',
      })
      expect(useKitWizardStore.getState().selectedEquipment).toMatchObject({
        eq_1: { qty: 2, dailyPrice: 100, model: 'Sony FX6', categoryId: 'cat_1' },
      })
    })
    it('uses qty 1 when qty is 0', () => {
      useKitWizardStore.getState().addEquipment('eq_1', 0, 50)
      expect(useKitWizardStore.getState().selectedEquipment.eq_1.qty).toBe(1)
    })
  })

  describe('removeEquipment', () => {
    it('removes equipment', () => {
      useKitWizardStore.getState().addEquipment('eq_1', 1, 100)
      useKitWizardStore.getState().removeEquipment('eq_1')
      expect(useKitWizardStore.getState().selectedEquipment).toEqual({})
    })
  })

  describe('setQty', () => {
    it('updates qty', () => {
      useKitWizardStore.getState().addEquipment('eq_1', 1, 100)
      useKitWizardStore.getState().setQty('eq_1', 3)
      expect(useKitWizardStore.getState().selectedEquipment.eq_1.qty).toBe(3)
    })
    it('removes equipment when qty < 1', () => {
      useKitWizardStore.getState().addEquipment('eq_1', 1, 100)
      useKitWizardStore.getState().setQty('eq_1', 0)
      expect(useKitWizardStore.getState().selectedEquipment).toEqual({})
    })
    it('no-op when equipment not found', () => {
      useKitWizardStore.getState().setQty('eq_99', 5)
      expect(useKitWizardStore.getState().selectedEquipment).toEqual({})
    })
  })

  describe('setDuration', () => {
    it('sets duration', () => {
      useKitWizardStore.getState().setDuration(5)
      expect(useKitWizardStore.getState().durationDays).toBe(5)
    })
    it('clamps to 1-365', () => {
      useKitWizardStore.getState().setDuration(0)
      expect(useKitWizardStore.getState().durationDays).toBe(1)
      useKitWizardStore.getState().setDuration(400)
      expect(useKitWizardStore.getState().durationDays).toBe(365)
    })
  })

  describe('toggleAiAssistant', () => {
    it('toggles showAiAssistant', () => {
      expect(useKitWizardStore.getState().showAiAssistant).toBe(false)
      useKitWizardStore.getState().toggleAiAssistant()
      expect(useKitWizardStore.getState().showAiAssistant).toBe(true)
      useKitWizardStore.getState().toggleAiAssistant()
      expect(useKitWizardStore.getState().showAiAssistant).toBe(false)
    })
  })

  describe('setDates', () => {
    it('updates dates and durationDays', () => {
      useKitWizardStore.getState().setDates('2026-06-01', '2026-06-05')
      expect(useKitWizardStore.getState().startDate).toBe('2026-06-01')
      expect(useKitWizardStore.getState().endDate).toBe('2026-06-05')
      expect(useKitWizardStore.getState().durationDays).toBe(4)
    })
  })

  describe('skipCategory', () => {
    it('adds category to skipped and advances', () => {
      useKitWizardStore.getState().setCategorySteps([
        { id: '1', categoryId: 'c1', categoryName: 'A', categorySlug: 'a', sortOrder: 0, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
        { id: '2', categoryId: 'c2', categoryName: 'B', categorySlug: 'b', sortOrder: 1, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
      ])
      useKitWizardStore.getState().skipCategory('c1')
      expect(useKitWizardStore.getState().skippedCategories).toContain('c1')
      expect(useKitWizardStore.getState().currentCategoryIndex).toBe(1)
    })
    it('does not duplicate when skipping same category again', () => {
      useKitWizardStore.getState().setCategorySteps([
        { id: '1', categoryId: 'c1', categoryName: 'A', categorySlug: 'a', sortOrder: 0, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
        { id: '2', categoryId: 'c2', categoryName: 'B', categorySlug: 'b', sortOrder: 1, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
      ])
      useKitWizardStore.getState().skipCategory('c1')
      useKitWizardStore.getState().skipCategory('c1')
      expect(useKitWizardStore.getState().skippedCategories.filter((x) => x === 'c1')).toHaveLength(1)
    })
  })

  describe('nextCategory / prevCategory', () => {
    it('advances and goes back', () => {
      useKitWizardStore.getState().setCategorySteps([
        { id: '1', categoryId: 'c1', categoryName: 'A', categorySlug: 'a', sortOrder: 0, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
        { id: '2', categoryId: 'c2', categoryName: 'B', categorySlug: 'b', sortOrder: 1, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
      ])
      useKitWizardStore.getState().nextCategory()
      expect(useKitWizardStore.getState().currentCategoryIndex).toBe(1)
      useKitWizardStore.getState().prevCategory()
      expect(useKitWizardStore.getState().currentCategoryIndex).toBe(0)
    })
  })

  describe('getKitWizardTotalDaily', () => {
    it('sums qty * dailyPrice', () => {
      const state = {
        selectedEquipment: {
          eq_1: { qty: 2, dailyPrice: 100 },
          eq_2: { qty: 1, dailyPrice: 50 },
        },
      }
      expect(getKitWizardTotalDaily(state)).toBe(250)
    })
  })

  describe('getKitWizardTotalAmount', () => {
    it('returns daily * durationDays', () => {
      const state = {
        selectedEquipment: { eq_1: { qty: 1, dailyPrice: 100 } },
        durationDays: 5,
      }
      expect(getKitWizardTotalAmount(state)).toBe(500)
    })
  })

  describe('getKitWizardSelectedCount', () => {
    it('returns count of equipment entries', () => {
      const state = {
        selectedEquipment: { eq_1: { qty: 2, dailyPrice: 100 }, eq_2: { qty: 1, dailyPrice: 50 } },
      }
      expect(getKitWizardSelectedCount(state)).toBe(2)
    })
  })

  describe('getKitWizardTotalUnits', () => {
    it('returns sum of qty', () => {
      const state = {
        selectedEquipment: { eq_1: { qty: 2, dailyPrice: 100 }, eq_2: { qty: 3, dailyPrice: 50 } },
      }
      expect(getKitWizardTotalUnits(state)).toBe(5)
    })
  })

  describe('getCurrentCategoryStep', () => {
    it('returns step at index', () => {
      const steps = [{ id: '1', categoryId: 'c1', categoryName: 'A', categorySlug: 'a', sortOrder: 0, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null }]
      expect(getCurrentCategoryStep({ categorySteps: steps, currentCategoryIndex: 0 })).toEqual(steps[0])
    })
    it('returns null when index out of range', () => {
      expect(getCurrentCategoryStep({ categorySteps: [], currentCategoryIndex: 5 })).toBeNull()
    })
  })

  describe('getSelectedByCategory', () => {
    it('groups by categoryId', () => {
      const state = {
        selectedEquipment: {
          eq_1: { qty: 1, dailyPrice: 100, categoryId: 'cat_1' },
          eq_2: { qty: 1, dailyPrice: 50, categoryId: 'cat_1' },
          eq_3: { qty: 1, dailyPrice: 75, categoryId: 'cat_2' },
        },
      }
      const map = getSelectedByCategory(state)
      expect(map.get('cat_1')).toHaveLength(2)
      expect(map.get('cat_2')).toHaveLength(1)
      expect(map.get('other')).toBeUndefined()
    })
    it('uses other for items without categoryId', () => {
      const state = {
        selectedEquipment: { eq_1: { qty: 1, dailyPrice: 100 } },
      }
      const map = getSelectedByCategory(state)
      expect(map.get('other')).toHaveLength(1)
    })
  })

  describe('getMissingCategories', () => {
    it('returns steps with no selected equipment in that category', () => {
      const steps = [
        { id: '1', categoryId: 'c1', categoryName: 'A', categorySlug: 'a', sortOrder: 0, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
        { id: '2', categoryId: 'c2', categoryName: 'B', categorySlug: 'b', sortOrder: 1, isRequired: false, minRecommended: null, maxRecommended: null, stepTitle: null, stepTitleAr: null, stepDescription: null, stepDescriptionAr: null },
      ]
      const selectedEquipment = { eq_1: { qty: 1, dailyPrice: 100, categoryId: 'c1' } }
      const missing = getMissingCategories({ categorySteps: steps, selectedEquipment })
      expect(missing).toHaveLength(1)
      expect(missing[0].categoryId).toBe('c2')
    })
  })

  describe('reset', () => {
    it('resets to default state', () => {
      useKitWizardStore.getState().setPhase('summary')
      useKitWizardStore.getState().addEquipment('eq_1', 1, 100)
      useKitWizardStore.getState().reset()
      expect(useKitWizardStore.getState().phase).toBe('shoot-type')
      expect(useKitWizardStore.getState().selectedEquipment).toEqual({})
    })
  })

  describe('persist partialize', () => {
    it('persists all partialized fields when state changes', () => {
      const { setPhase, setStep, setView, setShootType, setBudgetTier, setAnswer, addEquipment, setDuration, setDates } =
        useKitWizardStore.getState()
      setPhase('budget')
      setStep(2)
      setView('building')
      setShootType('st_1', 'commercial')
      setBudgetTier('PROFESSIONAL')
      setAnswer('q1', 'a1')
      addEquipment('eq_1', 2, 100, { model: 'FX6', categoryId: 'cat_1' })
      setDuration(7)
      setDates('2026-06-01', '2026-06-08')
      const state = useKitWizardStore.getState()
      expect(state.phase).toBe('budget')
      expect(state.step).toBe(2)
      expect(state.view).toBe('building')
      expect(state.shootTypeId).toBe('st_1')
      expect(state.shootTypeSlug).toBe('commercial')
      expect(state.budgetTier).toBe('PROFESSIONAL')
      expect(state.answers).toEqual({ q1: 'a1' })
      expect(state.selectedEquipment).toMatchObject({ eq_1: { qty: 2, dailyPrice: 100 } })
      expect(state.durationDays).toBe(7)
      expect(state.startDate).toBe('2026-06-01')
      expect(state.endDate).toBe('2026-06-08')
    })
  })
})
