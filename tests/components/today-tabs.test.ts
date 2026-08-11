import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TodayPage from '~/presentation/pages/today/index.vue'

const taskApi = vi.hoisted(() => ({
  fetchDueTasks: vi.fn().mockResolvedValue([]),
  fetchTodayPlan: vi.fn().mockResolvedValue({ date: '2026-08-11', tasks: [], focusMinutes: 0 }),
  fetchArchivedTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn()
}))
vi.mock('~/data/repositories/tasksRepository', () => taskApi)
vi.mock('~/data/repositories/projectsRepository', () => ({ fetchProjects: vi.fn().mockResolvedValue([]) }))

const mockRoute = vi.hoisted(() => ({ query: {} as Record<string, string> }))
mockNuxtImport('useRoute', () => () => mockRoute)

function stubs() {
  return {
    UIcon: { template: '<span />' },
    USkeleton: { template: '<div />' },
    PageHeader: { template: '<header />' },
    EmptyState: { template: '<div class="empty-state" />' },
    IconButton: { template: '<button type="button" />' },
    ProjectBadge: { template: '<span />' },
    TaskQuickCreate: { template: '<div />' },
    AppButton: { template: '<button type="button"><slot /></button>' },
    TaskEditor: { props: ['open', 'task'], template: '<div />' }
  }
}

describe('today page tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
    mockRoute.query = {}
  })

  it('defaults to the today tab when no mode query is present', async () => {
    const wrapper = await mountSuspended(TodayPage, { global: { stubs: stubs() } })
    await flushPromises()
    expect(wrapper.get('.today-page__view-button--active').text()).toContain('Today')
    expect(taskApi.fetchTodayPlan).toHaveBeenCalled()
  })

  it('activates the requested tab from the mode query', async () => {
    mockRoute.query = { mode: 'archive' }
    const wrapper = await mountSuspended(TodayPage, { global: { stubs: stubs() } })
    await flushPromises()
    expect(wrapper.get('.today-page__view-button--active').text()).toContain('Archive')
    expect(taskApi.fetchArchivedTasks).toHaveBeenCalled()
  })
})
