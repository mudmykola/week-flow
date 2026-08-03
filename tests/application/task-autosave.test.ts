import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTaskAutosave } from '~/application/composables/useTaskAutosave'

describe('task autosave', () => {
  afterEach(() => vi.useRealTimers())

  it('debounces patches and exposes the saved state', async () => {
    vi.useFakeTimers()
    const save = vi.fn().mockResolvedValue(undefined)
    let autosave: ReturnType<typeof useTaskAutosave>
    await mountSuspended(
      defineComponent({
        setup() {
          autosave = useTaskAutosave(save)
          return () => h('div')
        }
      })
    )
    autosave!.schedule({ title: 'First' })
    autosave!.schedule({ title: 'Final' })
    expect(autosave!.state.value).toBe('saving')
    await vi.advanceTimersByTimeAsync(550)
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith({ title: 'Final' })
    expect(autosave!.state.value).toBe('saved')
  })

  it('surfaces failed saves without reporting saved', async () => {
    vi.useFakeTimers()
    const save = vi.fn().mockRejectedValue(new Error('offline'))
    let autosave: ReturnType<typeof useTaskAutosave>
    await mountSuspended(
      defineComponent({
        setup() {
          autosave = useTaskAutosave(save)
          return () => h('div')
        }
      })
    )
    autosave!.schedule({ title: 'Task' })
    await vi.advanceTimersByTimeAsync(550)
    expect(autosave!.state.value).toBe('error')
    expect(autosave!.error.value).toBe('offline')
  })

  it('flushes the latest pending patch before the debounce ends', async () => {
    vi.useFakeTimers()
    const save = vi.fn().mockResolvedValue(undefined)
    let autosave: ReturnType<typeof useTaskAutosave>
    await mountSuspended(
      defineComponent({
        setup() {
          autosave = useTaskAutosave(save)
          return () => h('div')
        }
      })
    )
    autosave!.schedule({ title: 'Must persist before close' })
    expect(await autosave!.flush()).toBe(true)
    expect(save).toHaveBeenCalledWith({ title: 'Must persist before close' })
    expect(autosave!.state.value).toBe('saved')
  })

  it('serializes a newer patch scheduled while a save is in flight', async () => {
    vi.useFakeTimers()
    let finishFirst: (() => void) | undefined
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finishFirst = resolve)))
      .mockResolvedValue(undefined)
    let autosave: ReturnType<typeof useTaskAutosave>
    await mountSuspended(
      defineComponent({
        setup() {
          autosave = useTaskAutosave(save)
          return () => h('div')
        }
      })
    )
    autosave!.schedule({ title: 'First' })
    await vi.advanceTimersByTimeAsync(550)
    autosave!.schedule({ title: 'Latest' })
    finishFirst!()
    await autosave!.flush()
    expect(save.mock.calls).toEqual([[{ title: 'First' }], [{ title: 'Latest' }]])
    expect(autosave!.state.value).toBe('saved')
  })
})
