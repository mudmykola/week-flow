import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import BarBreakdown from '~/presentation/components/analytics/BarBreakdown.vue'
import DonutBreakdown from '~/presentation/components/analytics/DonutBreakdown.vue'
import TrendChart from '~/presentation/components/analytics/TrendChart.vue'

describe('dashboard visualizations', () => {
  it('renders trend points and accessible summary', async () => {
    const wrapper = await mountSuspended(TrendChart, {
      props: {
        data: [
          { label: 'W30', done: 2, total: 4 },
          { label: 'W31', done: 3, total: 5 }
        ]
      }
    })
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBeTruthy()
    expect(wrapper.findAll('circle')).toHaveLength(2)
    expect(wrapper.findAll('polyline')).toHaveLength(2)
    expect(wrapper.text()).toContain('W31')
  })

  it('creates a donut gradient and total', async () => {
    const wrapper = await mountSuspended(DonutBreakdown, {
      props: {
        items: [
          { label: 'Зробити', value: 2, color: '#aaa' },
          { label: 'Готово', value: 3, color: '#f50' }
        ]
      }
    })
    expect(wrapper.text()).toContain('5')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('5')
    expect(wrapper.find('[style*="conic-gradient"]').exists()).toBe(true)
  })

  it('scales priority bars against their maximum', async () => {
    const wrapper = await mountSuspended(BarBreakdown, {
      props: {
        items: [
          { label: 'High', value: 2, color: '#f00' },
          { label: 'Low', value: 1, color: '#aaa' }
        ]
      }
    })
    const bars = wrapper.findAll('[style*="width:"]')
    expect(bars[0]?.attributes('style')).toContain('width: 100%')
    expect(bars[1]?.attributes('style')).toContain('width: 50%')
  })
})
