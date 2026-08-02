import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppPreloader from '~/presentation/components/common/AppPreloader.vue'

describe('global application preloader', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('announces initial loading and releases the application after boot', async () => {
    vi.useFakeTimers()
    const wrapper = await mountSuspended(AppPreloader, {
      attachTo: document.body,
      global: { stubs: { UIcon: { template: '<span />' } } }
    })

    expect(document.body.querySelector('[role="status"][aria-busy="true"]')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(400)
    await nextTick()
    expect(document.body.querySelector('.app-preloader__overlay')).toBeNull()
    wrapper.unmount()
  })
})
