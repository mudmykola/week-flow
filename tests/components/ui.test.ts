import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EmptyState from '~/presentation/components/EmptyState.vue'
import MetricCard from '~/presentation/components/MetricCard.vue'
import TaskCard from '~/presentation/components/TaskCard.vue'
import { makeTask } from '../fixtures'

const stubs = { UIcon: { template: '<span class="icon" />' }, UButton: { template: '<button><slot /></button>' } }

describe('shared UI components', () => {
  it('renders metric content and trend', async () => {
    const wrapper = await mountSuspended(MetricCard, { props: { label: 'Виконано', value: 12, icon: 'i-lucide-check', trend: '+4', hint: 'За тиждень' }, global: { stubs } })
    expect(wrapper.text()).toContain('Виконано')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('+4')
    expect(wrapper.text()).toContain('За тиждень')
  })

  it('renders empty state and its action slot', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { title: 'Порожньо', description: 'Додайте задачу', icon: 'i-lucide-inbox' }, slots: { default: '<button>Створити</button>' }, global: { stubs } })
    expect(wrapper.text()).toContain('Порожньо')
    expect(wrapper.text()).toContain('Створити')
  })

  it('emits task interactions by mouse and keyboard', async () => {
    const task = makeTask({ note: 'Details', tags: ['one'], priority: 'urgent' })
    const wrapper = await mountSuspended(TaskCard, { props: { task }, global: { stubs } })
    await wrapper.get('article').trigger('click')
    await wrapper.get('article').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('edit')).toHaveLength(2)
    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    await buttons.at(-1)!.trigger('click')
    expect(wrapper.emitted('cycleStatus')?.[0]).toEqual([task])
    expect(wrapper.emitted('delete')?.[0]).toEqual([task.id])
  })

  it('hides secondary task details in compact mode', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask({ note: 'Hidden note', tags: ['hidden'] }), compact: true }, global: { stubs } })
    expect(wrapper.text()).not.toContain('Hidden note')
    expect(wrapper.text()).not.toContain('hidden')
  })
})
