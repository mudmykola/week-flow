import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import BarBreakdown from '~/presentation/components/analytics/BarBreakdown.vue'
import ChartLegendButton from '~/presentation/components/analytics/ChartLegendButton.vue'
import DonutBreakdown from '~/presentation/components/analytics/DonutBreakdown.vue'
import TrendChart from '~/presentation/components/analytics/TrendChart.vue'

vi.mock('@unovis/vue/containers/xy-container', () => ({
  default: { name: 'VisXYContainer', template: '<div data-chart="xy"><slot /></div>' }
}))
vi.mock('@unovis/vue/containers/single-container', () => ({
  default: { name: 'VisSingleContainer', template: '<div data-chart="single"><slot /></div>' }
}))
vi.mock('@unovis/vue/components/line', () => ({
  default: { name: 'VisLine', template: '<div data-series="line" />' }
}))
vi.mock('@unovis/vue/components/donut', () => ({
  default: { name: 'VisDonut', template: '<div data-series="donut" />' }
}))
vi.mock('@unovis/vue/components/grouped-bar', () => ({
  default: { name: 'VisGroupedBar', template: '<div data-series="bar" />' }
}))
vi.mock('@unovis/vue/components/axis', () => ({ default: { name: 'VisAxis', template: '<div data-axis />' } }))
vi.mock('@unovis/vue/components/tooltip', () => ({ default: { name: 'VisTooltip', template: '<div />' } }))
vi.mock('@unovis/vue/components/crosshair', () => ({ default: { name: 'VisCrosshair', template: '<div />' } }))

describe('dashboard visualizations', () => {
  it('reuses a typed accessible legend button in inline and split layouts', async () => {
    const wrapper = await mountSuspended(ChartLegendButton, {
      props: { item: { key: 'high', label: 'High', value: 2, color: '#f00' }, layout: 'split' },
      global: { stubs: { UIcon: true } }
    })
    expect(wrapper.classes()).toContain('chart-legend-button--split')
    expect(wrapper.classes()).toContain('app-button')
    expect(wrapper.attributes('aria-label')).toBe('High: 2')
    expect(wrapper.get('.chart-legend-button__swatch').attributes('aria-hidden')).toBe('true')
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ key: 'high', value: 2 })
  })

  it('passes throughput series to the interactive line chart with an accessible summary', async () => {
    const wrapper = await mountSuspended(TrendChart, {
      props: {
        data: [
          { label: 'W30', created: 4, done: 2, overdue: 1 },
          { label: 'W31', created: 5, done: 3, overdue: 0 }
        ]
      }
    })
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBeTruthy()
    expect(wrapper.findAll('[data-series="line"]')).toHaveLength(3)
  })

  it('passes status totals to the donut and exposes keyboard drill-down controls', async () => {
    const wrapper = await mountSuspended(DonutBreakdown, {
      props: {
        items: [
          { key: 'todo', label: 'Зробити', value: 2, color: '#aaa' },
          { key: 'done', label: 'Готово', value: 3, color: '#f50' }
        ]
      }
    })
    expect(wrapper.text()).toContain('5')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('5')
    expect(wrapper.get('[data-series="donut"]').exists()).toBe(true)
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ key: 'done', value: 3 })
  })

  it('renders an interactive priority chart and labeled drill-down buttons', async () => {
    const wrapper = await mountSuspended(BarBreakdown, {
      props: {
        items: [
          { key: 'high', label: 'High', value: 2, color: '#f00' },
          { key: 'low', label: 'Low', value: 1, color: '#aaa' }
        ]
      }
    })
    expect(wrapper.get('[data-series="bar"]').exists()).toBe(true)
    expect(wrapper.findAll('.chart-legend-button__label')[0]?.text()).toBe('High')
    expect(wrapper.findAll('.chart-legend-button__value')[0]?.text()).toBe('2')
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ key: 'high', value: 2 })
  })

  it('keeps chart legend markup out of chart containers', () => {
    const bar = readFileSync(resolve(process.cwd(), 'app/presentation/components/analytics/BarBreakdown.vue'), 'utf8')
    const donut = readFileSync(
      resolve(process.cwd(), 'app/presentation/components/analytics/DonutBreakdown.vue'),
      'utf8'
    )
    expect(bar).toContain('<ChartLegendButton')
    expect(donut).toContain('<ChartLegendButton')
    expect(bar).not.toContain('class="size-2 rounded-full"')
    expect(donut).not.toContain('class="size-2.5 rounded-full"')
  })
})
