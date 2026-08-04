import { fetchMyGoals, updateGoal } from '~/data/repositories/goalsRepository'
import type { Goal, UpdateGoalInput } from '~/domain/entities/goal'
import { sortGoalsForDisplay } from '~/domain/services/goals'

export const useGoalsStore = defineStore('goals', () => {
  const goals = ref<Goal[]>([])
  const loading = ref(false)

  const activeGoals = computed(() => sortGoalsForDisplay(goals.value.filter((goal) => goal.status !== 'done')))
  const completedGoals = computed(() => goals.value.filter((goal) => goal.status === 'done'))

  async function loadGoals() {
    loading.value = true
    try {
      goals.value = await fetchMyGoals()
    } finally {
      loading.value = false
    }
  }

  async function patchGoal(id: string, patch: UpdateGoalInput) {
    const index = goals.value.findIndex((goal) => goal.id === id)
    const previous = index === -1 ? null : { ...goals.value[index]! }
    if (index !== -1) goals.value[index] = { ...goals.value[index]!, ...patch }
    try {
      const goal = await updateGoal(id, patch)
      const currentIndex = goals.value.findIndex((item) => item.id === id)
      if (currentIndex !== -1) goals.value[currentIndex] = goal
      return goal
    } catch (error) {
      const currentIndex = goals.value.findIndex((item) => item.id === id)
      if (previous && currentIndex !== -1) goals.value[currentIndex] = previous
      throw error
    }
  }

  return { goals, loading, activeGoals, completedGoals, loadGoals, patchGoal }
})
