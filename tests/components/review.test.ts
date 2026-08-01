import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewPage from '~/presentation/pages/review/index.vue'

vi.mock('~/data/repositories/tasksRepository', () => ({
  fetchAllTasks: vi.fn().mockResolvedValue([]),
  moveWeekTasks: vi.fn().mockResolvedValue({ moved: 0 })
}))

describe('localized weekly review', () => {
  beforeEach(() => localStorage.clear())

  it('resolves prompt messages and inserts their text into notes', async () => {
    const wrapper = await mountSuspended(ReviewPage, {
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          UButton: { template: '<button><slot /></button>' },
          USkeleton: { template: '<div />' },
          PageHeader: { template: '<header><slot name="actions" /></header>' },
          MetricCard: { template: '<div />' }
        }
      }
    })
    await flushPromises()

    const promptButtons = wrapper.findAll('.app-button')
    expect(promptButtons).toHaveLength(4)
    expect(promptButtons.every((button) => button.text() && button.text() !== '[object Object]')).toBe(true)

    const firstPrompt = promptButtons[0]!.text()
    await promptButtons[0]!.trigger('click')
    expect(wrapper.get('textarea').element.value).toContain(firstPrompt)
  })
})
