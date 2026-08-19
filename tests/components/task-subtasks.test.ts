import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TaskSubtaskItem from '~/presentation/components/task/TaskSubtaskItem.vue'
import FormTextarea from '~/presentation/components/form/FormTextarea.vue'
import { makeTask } from '../fixtures'

const item = {
  id: 'subtask-1',
  taskId: makeTask().id,
  title: 'Перевірити редактор',
  note: 'Стара нотатка',
  done: false,
  status: 'todo' as const,
  priority: 'medium' as const,
  plannedDate: null,
  originalPlannedDate: null,
  rescheduleCount: 0,
  dueDate: null,
  assigneeId: null,
  sort: 0,
  createdAt: 1,
  doneAt: null
}

describe('task subtask editor', () => {
  it('saves the note once on blur instead of on every typed character', async () => {
    const wrapper = await mountSuspended(TaskSubtaskItem, {
      props: { item, assignees: [] },
      global: {
        components: { FormTextarea },
        stubs: {
          UIcon: { template: '<span />' },
          IconButton: { template: '<button type="button" />' },
          DropdownMenu: { template: '<div><slot /></div>' }
        }
      }
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    const textarea = wrapper.get('textarea')
    await textarea.setValue('Нова нотатка')
    expect(wrapper.emitted('patch')).toBeUndefined()
    await textarea.trigger('blur')
    expect(wrapper.emitted('patch')?.at(-1)).toEqual(['subtask-1', { note: 'Нова нотатка' }])
  })

  it('keeps done and status synchronized when checking a subtask', async () => {
    const wrapper = await mountSuspended(TaskSubtaskItem, {
      props: { item, assignees: [] },
      global: { stubs: { UIcon: { template: '<span />' }, DropdownMenu: true } }
    })
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(wrapper.emitted('patch')?.[0]).toEqual(['subtask-1', { done: true, status: 'done' }])
  })

  it('allows an unfinished subtask to be planned for another day', async () => {
    const wrapper = await mountSuspended(TaskSubtaskItem, {
      props: { item, assignees: [] },
      global: { stubs: { UIcon: { template: '<span />' }, DropdownMenu: true } }
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    const plannedDate = wrapper.findAll('input[type="date"]')[0]!
    await plannedDate.setValue('2026-08-20')
    expect(wrapper.emitted('patch')?.at(-1)).toEqual(['subtask-1', { plannedDate: '2026-08-20' }])
  })
})
