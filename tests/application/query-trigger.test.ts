import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { LocationQueryRaw } from 'vue-router'
import { useQueryTrigger } from '~/application/composables/useQueryTrigger'

describe('query route triggers', () => {
  it('waits for readiness, runs once and removes only the consumed query', async () => {
    const route = reactive({ query: { new: '1', week: '2026-W31' } as LocationQueryRaw })
    const replace = vi.fn(async ({ query }: { query: LocationQueryRaw }) => {
      route.query = query
    })
    const ready = ref(false)
    const handler = vi.fn()
    const component = defineComponent({
      setup() {
        useQueryTrigger('new', '1', ready, handler, { route, replace })
        return () => h('div')
      }
    })
    await mountSuspended(component)
    expect(handler).not.toHaveBeenCalled()
    ready.value = true
    await nextTick()
    await flushPromises()
    expect(handler).toHaveBeenCalledOnce()
    expect(replace).toHaveBeenCalledWith({ query: { week: '2026-W31' } })
    expect(route.query).toEqual({ week: '2026-W31' })
  })
})
