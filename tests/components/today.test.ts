import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TaskListView from '~/presentation/components/task/TaskListView.vue'
import { localDateKey } from '~/domain/services/today'
import { makeTask } from '../fixtures'

const today = localDateKey()
const yesterday = localDateKey(new Date(Date.now() - 86_400_000))

const taskApi = vi.hoisted(() => ({
  fetchDueTasks: vi.fn(),
  fetchArchivedTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn()
}))
vi.mock('~/data/repositories/tasksRepository', () => taskApi)
vi.mock('~/data/repositories/projectsRepository', () => ({ fetchProjects: vi.fn().mockResolvedValue([]) }))

function stubs() {
  return {
    UIcon: { template: '<span />' },
    USkeleton: { template: '<div />' },
    PageHeader: { template: '<header />' },
    EmptyState: { template: '<div class="empty-state" />' },
    IconButton: { template: '<button type="button" @click="$emit(\'click\', $event)" />' },
    ProjectBadge: { template: '<span />' },
    TaskQuickCreate: { template: '<div class="task-quick-create-stub" />' },
    TaskEditor: {
      props: ['open', 'task'],
      template: '<div class="task-editor-stub" :data-open="open" :data-task-id="task && task.id" />'
    }
  }
}

describe('TaskListView (today)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows an overdue section above today and sorts today by priority', async () => {
    const overdue = makeTask({ id: 'overdue-1', title: 'Late task', dueDate: yesterday, status: 'todo' })
    const low = makeTask({ id: 'low', title: 'Low prio', dueDate: today, priority: 'low' })
    const urgent = makeTask({ id: 'urgent', title: 'Urgent prio', dueDate: today, priority: 'urgent' })
    taskApi.fetchDueTasks.mockResolvedValue([low, overdue, urgent])

    const wrapper = await mountSuspended(TaskListView, {
      props: { mode: 'today', title: 'Today', icon: 'i-lucide-sun' },
      global: { stubs: stubs() }
    })
    await flushPromises()

    const sections = wrapper.findAll('section')
    expect(sections[0]!.text()).toContain('Late task')

    const titles = wrapper.findAll('article').map((article) => article.text())
    expect(titles[0]).toContain('Late task')
    expect(titles[1]).toContain('Urgent prio')
    expect(titles[2]).toContain('Low prio')
  })

  it('opens the task editor when a row is clicked', async () => {
    const task = makeTask({ id: 'task-1', title: 'Plan trip', dueDate: today })
    taskApi.fetchDueTasks.mockResolvedValue([task])
    const wrapper = await mountSuspended(TaskListView, {
      props: { mode: 'today', title: 'Today', icon: 'i-lucide-sun' },
      global: { stubs: stubs() }
    })
    await flushPromises()

    await wrapper.get('article').trigger('click')
    const editor = wrapper.get('.task-editor-stub')
    expect(editor.attributes('data-open')).toBe('true')
    expect(editor.attributes('data-task-id')).toBe('task-1')
  })

  it('deletes a task and recreates it on undo', async () => {
    const task = makeTask({ id: 'task-1', title: 'Buy milk', dueDate: today })
    taskApi.fetchDueTasks.mockResolvedValue([task])
    taskApi.deleteTask.mockImplementation(async () => {
      taskApi.fetchDueTasks.mockResolvedValue([])
      return { ok: true }
    })
    const wrapper = await mountSuspended(TaskListView, {
      props: { mode: 'today', title: 'Today', icon: 'i-lucide-sun' },
      global: { stubs: stubs() }
    })
    await flushPromises()

    const buttons = wrapper.get('article').findAll('button')
    await buttons[buttons.length - 1]!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Buy milk')

    const recreated = makeTask({ id: 'task-2', title: 'Buy milk', dueDate: today })
    taskApi.createTask.mockImplementation(async () => {
      taskApi.fetchDueTasks.mockResolvedValue([recreated])
      return recreated
    })
    await wrapper.get('button.font-semibold').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Buy milk')
  })
})
