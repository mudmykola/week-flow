import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import TrendChart from '~/presentation/components/analytics/TrendChart.vue'

vi.mock('@unovis/vue/components/tooltip', () => ({ default: { template: '<div data-tooltip />' } }))
vi.mock('@unovis/vue/components/crosshair', () => ({ default: { template: '<div data-crosshair />' } }))

describe('analytics chart runtime', () => {
  it('mounts the real Unovis chart implementation', async () => {
    vi.useFakeTimers()
    const wrapper = await mountSuspended(TrendChart, {
      props: {
        data: [
          { label: 'W30', created: 4, done: 2, overdue: 1 },
          { label: 'W31', created: 5, done: 3, overdue: 0 }
        ]
      },
      attachTo: document.body
    })

    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBeTruthy()
    expect(wrapper.find('svg').exists()).toBe(true)
    wrapper.unmount()
    vi.clearAllTimers()
    vi.useRealTimers()
  })
})
