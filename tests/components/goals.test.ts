import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GoalsPage from '~/presentation/pages/goals/index.vue'

function makeGoal(overrides: Partial<import('~/domain/entities/goal').Goal> = {}) {
  return {
    id: 'goal-1',
    teamId: 'team-1',
    assigneeId: 'user-1',
    title: 'Ship v2',
    description: null,
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

function stubs() {
  return {
    UIcon: { template: '<span />' },
    USkeleton: { template: '<div />' },
    PageHeader: { template: '<header />' },
    EmptyState: { template: '<div class="empty-state" />' }
  }
}

describe('goals page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('splits goals into active and completed sections', async () => {
    goalApi.fetchMyGoals.mockResolvedValue([
      makeGoal({ id: 'a', title: 'Active goal' }),
      makeGoal({ id: 'b', title: 'Done goal', status: 'done', progress: 100 })
    ])
    const wrapper = await mountSuspended(GoalsPage, { global: { stubs: stubs() } })
    await flushPromises()

    const sections = wrapper.findAll('section')
    expect(sections[0]!.text()).toContain('Active goal')
    expect(sections[1]!.text()).toContain('Done goal')
  })

  it('marks an overdue goal with the urgency class', async () => {
    goalApi.fetchMyGoals.mockResolvedValue([makeGoal({ dueDate: '2020-01-01' })])
    const wrapper = await mountSuspended(GoalsPage, { global: { stubs: stubs() } })
    await flushPromises()

    expect(wrapper.get('article').classes()).toContain('border-[var(--color-danger)]')
  })

  it('shows a read-only progress bar instead of the slider when linked to a project', async () => {
    goalApi.fetchMyGoals.mockResolvedValue([makeGoal({ projectId: 'project-1', projectName: 'Website' })])
    const wrapper = await mountSuspended(GoalsPage, { global: { stubs: stubs() } })
    await flushPromises()

    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Website')
  })

  it('updates progress through the slider for an unlinked goal', async () => {
    const goal = makeGoal()
    goalApi.fetchMyGoals.mockResolvedValue([goal])
    goalApi.updateGoal.mockResolvedValue({ ...goal, progress: 50 })
    const wrapper = await mountSuspended(GoalsPage, { global: { stubs: stubs() } })
    await flushPromises()

    const slider = wrapper.get('input[type="range"]')
    await slider.setValue(50)
    await slider.trigger('change')
    await flushPromises()

    expect(goalApi.updateGoal).toHaveBeenCalledWith('goal-1', { progress: 50 })
  })
})
