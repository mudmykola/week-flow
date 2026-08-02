import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import CalendarPage from '~/presentation/pages/calendar/index.vue'
import { makeTask } from '../fixtures'

vi.mock('~/data/repositories/tasksRepository', () => ({
  fetchAllTasks: vi.fn().mockResolvedValue([])
}))

describe('localized calendar', () => {
  it('resolves locale message array entries into weekday text', async () => {
    const wrapper = await mountSuspended(CalendarPage, {
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          USkeleton: { template: '<div />' },
          PageHeader: { template: '<header><slot name="actions" /></header>' },
          NuxtLink: { template: '<a><slot /></a>' }
        }
      }
    })
    await flushPromises()
    const headings = wrapper.findAll('.calendar-month__weekdays > div').map((item) => item.text())
    expect(headings).toHaveLength(7)
    expect(headings.every((day) => day.length > 0 && day !== '[object Object]')).toBe(true)
  })

  it('shows a newly created dated task without leaving the calendar', async () => {
    const wrapper = await mountSuspended(CalendarPage, {
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          USkeleton: { template: '<div />' },
          PageHeader: { template: '<header><slot name="actions" /></header>' },
          NuxtLink: { template: '<a><slot /></a>' }
        }
      }
    })
    await flushPromises()
    useEventBus('weekflow:task-created').emit(
      makeTask({ title: 'Calendar quick task', dueDate: new Date().toISOString().slice(0, 10) })
    )
    await flushPromises()
    expect(wrapper.text()).toContain('Calendar quick task')
  })
})
