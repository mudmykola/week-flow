import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TaskEditor from '~/presentation/components/task/TaskEditor.vue'
import { makeTask } from '../fixtures'

describe('task editor hydration', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not reset active input when the same task receives an autosave response', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ subtasks: [], comments: [], activity: [] }))
    const task = makeTask({ title: 'Initial title' })
    const wrapper = await mountSuspended(TaskEditor, {
      props: { open: true, task, projects: [], assignees: [] },
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          AppDrawer: { template: '<div><slot /><slot name="footer" /></div>' }
        }
      }
    })
    const title = wrapper.get('.task-title-editor')
    await title.setValue('Typing without jumps')
    await wrapper.setProps({ task: { ...task, note: 'Autosave response' } })
    expect(title.element.value).toBe('Typing without jumps')
  })

  it('hydrates the form when the selected task id changes', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ subtasks: [], comments: [], activity: [] }))
    const wrapper = await mountSuspended(TaskEditor, {
      props: { open: true, task: makeTask({ id: 'task-1', title: 'First task' }), projects: [], assignees: [] },
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          AppDrawer: { template: '<div><slot /><slot name="footer" /></div>' }
        }
      }
    })
    await wrapper.setProps({ task: makeTask({ id: 'task-2', title: 'Second task' }) })
    expect(wrapper.get('.task-title-editor').element.value).toBe('Second task')
  })
})
