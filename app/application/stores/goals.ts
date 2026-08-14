import { createTeamGoal, fetchMyGoals, updateGoal } from '~/data/repositories/goalsRepository'
import type { CreateGoalInput, Goal, UpdateGoalInput } from '~/domain/entities/goal'
import { sortGoalsForDisplay } from '~/domain/services/goals'

export const useGoalsStore = defineStore('goals', () => {
  const goals = ref<Goal[]>([])
  const loading = ref(false)

  const activeGoals = computed(() => sortGoalsForDisplay(goals.value.filter((goal) => goal.status !== 'done')))
  const completedGoals = computed(() => goals.value.filter((goal) => goal.status === 'done'))
  const activeCount = computed(() => activeGoals.value.length)

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
      broadcastSync('goals')
      return goal
    } catch (error) {
      const currentIndex = goals.value.findIndex((item) => item.id === id)
      if (previous && currentIndex !== -1) goals.value[currentIndex] = previous
      throw error
    }
  }

  async function addGoal(input: CreateGoalInput, currentUserId?: string) {
    const goal = await createTeamGoal(input)
    if (goal.assigneeId && goal.assigneeId === currentUserId && !goals.value.some((item) => item.id === goal.id)) {
      goals.value.unshift(goal)
    }
    broadcastSync('goals')
    return goal
  }

  function reset() {
    goals.value = []
    loading.value = false
  }

  return { goals, loading, activeGoals, completedGoals, activeCount, loadGoals, patchGoal, addGoal, reset }
})
