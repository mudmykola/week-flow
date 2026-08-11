import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { broadcastSync, useLiveRefresh } from '~/application/composables/useLiveRefresh'

describe('useLiveRefresh / broadcastSync', () => {
  let otherTab: BroadcastChannel | undefined
  afterEach(() => otherTab?.close())

  it('reacts only to messages of its own kind, as if received from another tab', async () => {
    const refetch = vi.fn()
    const Consumer = defineComponent({
      setup() {
        useLiveRefresh('tasks', refetch)
        return () => h('div')
      }
    })
    await mountSuspended(Consumer)

    otherTab = new BroadcastChannel('weekflow-sync')
    otherTab.postMessage('goals')
    await flushPromises()
    expect(refetch).not.toHaveBeenCalled()

    otherTab.postMessage('tasks')
    await flushPromises()
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('broadcastSync posts a message another tab can observe', async () => {
    otherTab = new BroadcastChannel('weekflow-sync')
    const received = vi.fn()
    otherTab.addEventListener('message', (event) => received(event.data))

    broadcastSync('projects')
    await flushPromises()

    expect(received).toHaveBeenCalledWith('projects')
  })

  it('refreshes consumers in the same tab immediately', async () => {
    const refetch = vi.fn()
    const Consumer = defineComponent({
      setup() {
        useLiveRefresh('tasks', refetch)
        return () => h('div')
      }
    })
    await mountSuspended(Consumer)

    broadcastSync('tasks')
    await flushPromises()

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
