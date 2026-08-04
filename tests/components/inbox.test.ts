import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InboxPage from '~/presentation/pages/inbox/index.vue'
import { makeTask } from '../fixtures'

const taskApi = vi.hoisted(() => ({
  fetchInboxTasks: vi.fn(),
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
    TaskQuickCreate: {
      template:
        '<div class="task-quick-create-stub" @click="' +
        "$emit('create', { title: 'Captured idea', status: 'todo', projectId: null, assigneeId: null, dueDate: null, priority: 'medium' })" +
        '" />'
    },
    TaskEditor: {
      props: ['open', 'task'],
      template: '<div class="task-editor-stub" :data-open="open" :data-task-id="task && task.id" />'
    }
  }
}

describe('inbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('captures a new task through the quick-create bar', async () => {
    taskApi.fetchInboxTasks.mockResolvedValue([])
    taskApi.createTask.mockResolvedValue(makeTask({ id: 'new-task', title: 'Captured idea' }))
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()

    await wrapper.get('.task-quick-create-stub').trigger('click')
    await flushPromises()

    expect(taskApi.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Captured idea', status: 'todo' }))
    expect(wrapper.text()).toContain('Captured idea')
  })

  it('completes a task and restores it on undo', async () => {
    const task = makeTask({ id: 'task-1', title: 'Finish report' })
    taskApi.fetchInboxTasks.mockResolvedValue([task])
    taskApi.updateTask.mockResolvedValue({ ...task, status: 'done' })
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()

    await wrapper.findAll('article')[0]!.findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Finish report')

    taskApi.updateTask.mockResolvedValue(task)
    await wrapper.get('button.font-semibold').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Finish report')
  })

  it('deletes a task and recreates it on undo', async () => {
    const task = makeTask({ id: 'task-1', title: 'Buy groceries' })
    taskApi.fetchInboxTasks.mockResolvedValue([task])
    taskApi.deleteTask.mockResolvedValue({ ok: true })
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()

    await wrapper.findAll('article')[0]!.findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Buy groceries')

    taskApi.createTask.mockResolvedValue(makeTask({ id: 'task-2', title: 'Buy groceries' }))
    await wrapper.get('button.font-semibold').trigger('click')
    await flushPromises()
    expect(taskApi.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Buy groceries' }))
    expect(wrapper.text()).toContain('Buy groceries')
  })

  it('marks a task older than three days as stale', async () => {
    const staleTask = makeTask({ id: 'old', title: 'Old idea', createdAt: Date.now() - 4 * 86_400_000 })
    taskApi.fetchInboxTasks.mockResolvedValue([staleTask])
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()

    expect(wrapper.findAll('article')[0]!.classes()).toContain('border-amber-500/60')
  })

  it('opens the task editor with the clicked task', async () => {
    const task = makeTask({ id: 'task-1', title: 'Plan trip' })
    taskApi.fetchInboxTasks.mockResolvedValue([task])
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()

    await wrapper.findAll('article')[0]!.trigger('click')
    const editor = wrapper.get('.task-editor-stub')
    expect(editor.attributes('data-open')).toBe('true')
    expect(editor.attributes('data-task-id')).toBe('task-1')
  })
})
