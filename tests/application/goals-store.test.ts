import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeGoal(overrides: Partial<import('~/domain/entities/goal').Goal> = {}) {
  return {
    id: 'goal-1',
    teamId: 'team-1',
    assigneeId: 'user-1',
    title: 'Ship v2',
    description: null,
    priority: 'medium' as const,
    labels: [],
    progress: 20,
    status: 'active' as const,
    dueDate: null,
    projectId: null,
    createdBy: 'manager-1',
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

const goalApi = vi.hoisted(() => ({ fetchMyGoals: vi.fn(), updateGoal: vi.fn(), createTeamGoal: vi.fn() }))
vi.mock('~/data/repositories/goalsRepository', () => goalApi)

import { useGoalsStore } from '~/application/stores/goals'

describe('goals store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads goals and splits them into active/completed sorted by due date', async () => {
    const goals = [
      makeGoal({ id: 'a', dueDate: '2026-08-10' }),
      makeGoal({ id: 'b', dueDate: '2026-08-05' }),
      makeGoal({ id: 'c', dueDate: null }),
      makeGoal({ id: 'd', status: 'done', progress: 100 })
    ]
    goalApi.fetchMyGoals.mockResolvedValue(goals)
    const store = useGoalsStore()
    await store.loadGoals()
    expect(store.loading).toBe(false)
    expect(store.activeGoals.map((goal) => goal.id)).toEqual(['b', 'a', 'c'])
    expect(store.completedGoals.map((goal) => goal.id)).toEqual(['d'])
  })

  it('optimistically patches a goal and rolls back on failure', async () => {
    const goal = makeGoal()
    const store = useGoalsStore()
    store.goals = [goal]
    goalApi.updateGoal.mockRejectedValue(new Error('network'))
    const patch = store.patchGoal(goal.id, { progress: 80 })
    expect(store.goals[0]?.progress).toBe(80)
    await expect(patch).rejects.toThrow('network')
    expect(store.goals[0]).toEqual(goal)
  })

  it('replaces the goal with the server response on success', async () => {
    const goal = makeGoal()
    const updated = { ...goal, progress: 60 }
    const store = useGoalsStore()
    store.goals = [goal]
    goalApi.updateGoal.mockResolvedValue(updated)
    await store.patchGoal(goal.id, { progress: 60 })
    expect(store.goals[0]).toEqual(updated)
  })

  it('patches a goal that is not (or no longer) in the local list without touching the array', async () => {
    const store = useGoalsStore()
    store.goals = []
    goalApi.updateGoal.mockResolvedValue(makeGoal({ progress: 60 }))
    await store.patchGoal('goal-1', { progress: 60 })
    expect(store.goals).toEqual([])

    goalApi.updateGoal.mockRejectedValue(new Error('gone'))
    await expect(store.patchGoal('goal-1', { progress: 90 })).rejects.toThrow('gone')
    expect(store.goals).toEqual([])
  })

  it('clears account-scoped goals', () => {
    const store = useGoalsStore()
    store.goals = [makeGoal()]
    store.reset()
    expect(store.goals).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('adds a self-assigned goal immediately and exposes the active navigation count', async () => {
    const store = useGoalsStore()
    const goal = makeGoal({ assigneeId: 'user-1', title: 'Complete the Anthropic course' })
    goalApi.createTeamGoal.mockResolvedValue(goal)

    await store.addGoal({ title: goal.title, assigneeId: 'user-1' }, 'user-1')

    expect(store.goals).toEqual([goal])
    expect(store.activeCount).toBe(1)
  })

  it('does not mix another member goal into the personal goal list', async () => {
    const store = useGoalsStore()
    goalApi.createTeamGoal.mockResolvedValue(makeGoal({ assigneeId: 'user-2' }))

    await store.addGoal({ title: 'Team goal', assigneeId: 'user-2' }, 'user-1')

    expect(store.goals).toEqual([])
  })
})
