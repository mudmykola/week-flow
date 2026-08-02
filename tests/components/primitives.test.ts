import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { USkeleton } from '#components'
import AppButton from '~/presentation/components/base/AppButton.vue'
import FormInput from '~/presentation/components/form/FormInput.vue'
import AppModal from '~/presentation/components/overlay/Modal.vue'
import IconButton from '~/presentation/components/base/IconButton.vue'

const stubs = { UIcon: { template: '<span class="icon" />' }, Teleport: true }

describe('UI primitives', () => {
  it('uses the WeekFlow theme-aware skeleton surface globally', async () => {
    const wrapper = await mountSuspended({ components: { USkeleton }, template: '<USkeleton class="h-8" />' })
    expect(wrapper.get('[aria-busy="true"]').classes()).toContain('weekflow-skeleton')
  })

  it('renders button variants and forwards click events', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { variant: 'primary', icon: 'i-lucide-plus' },
      slots: { default: 'Створити' },
      global: { stubs }
    })
    await wrapper.get('button').trigger('click')
    expect(wrapper.classes()).toContain('ui-button--primary')
    expect(wrapper.text()).toContain('Створити')
    expect(wrapper.get('button').exists()).toBe(true)
  })

  it('provides a typed v-model input and forwards attributes', async () => {
    const wrapper = await mountSuspended(FormInput, {
      props: { modelValue: '', placeholder: 'Назва' },
      global: { stubs }
    })
    await wrapper.get('input').setValue('WeekFlow')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['WeekFlow'])
    expect(wrapper.get('input').attributes('placeholder')).toBe('Назва')
  })

  it('composes modal content and emits close', async () => {
    const wrapper = await mountSuspended(AppModal, {
      props: { open: true, title: 'Налаштування' },
      slots: { default: '<p>Вміст</p>' },
      global: { stubs, components: { IconButton } }
    })
    expect(wrapper.text()).toContain('Налаштування')
    expect(wrapper.text()).toContain('Вміст')
    await wrapper.get('button[aria-label]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
