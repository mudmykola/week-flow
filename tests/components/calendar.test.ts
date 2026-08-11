import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CalendarPage from '~/presentation/pages/calendar/index.vue'
import { localDateKey } from '~/domain/services/today'
import { makeTask } from '../fixtures'

const taskRepository = vi.hoisted(() => ({
  fetchAllTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn(),
  updateTask: vi.fn()
}))

vi.mock('~/data/repositories/tasksRepository', () => taskRepository)
vi.mock('~/data/repositories/projectsRepository', () => ({ fetchProjects: vi.fn().mockResolvedValue([]) }))

describe('localized calendar', () => {
  beforeEach(() => {
    localStorage.clear()
    taskRepository.fetchAllTasks.mockResolvedValue([])
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
  })
  afterEach(() => vi.unstubAllGlobals())

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
      makeTask({ title: 'Calendar quick task', plannedDate: localDateKey(), dueDate: null })
    )
    await flushPromises()
    expect(wrapper.text()).toContain('Calendar quick task')
  })

  it('exposes month, week and agenda planning modes', async () => {
    const wrapper = await mountSuspended(CalendarPage, {
      global: { stubs: { UIcon: { template: '<span />' }, USkeleton: { template: '<div />' } } }
    })
    await flushPromises()
    const modeButtons = wrapper.findAll('.calendar-workspace__views button')
    expect(modeButtons).toHaveLength(3)
    await modeButtons[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.calendar-week').exists()).toBe(true)
    await modeButtons[2]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.calendar-agenda').exists()).toBe(true)
  })

  it('keeps the page header focused on planning without a duplicate create action', async () => {
    const wrapper = await mountSuspended(CalendarPage, {
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          USkeleton: { template: '<div />' },
          PageHeader: { template: '<header><slot name="actions" /></header>' }
        }
      }
    })
    await flushPromises()
    expect(wrapper.get('header').text()).toContain('Schedule the week')
    expect(wrapper.get('header').text()).not.toContain('New task')
  })
})
