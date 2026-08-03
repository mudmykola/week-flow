import type { UpdateTaskInput } from '~/domain/entities/task'

export function useTaskAutosave(save: (patch: UpdateTaskInput) => Promise<void>) {
  const state = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: UpdateTaskInput | undefined
  let running: Promise<boolean> | undefined

  async function persist(): Promise<boolean> {
    clearTimeout(timer)
    if (running) await running
    if (!pending) return state.value !== 'error'
    const patch = pending
    pending = undefined
    state.value = 'saving'
    error.value = null
    running = (async () => {
      try {
        await save(patch)
        if (!pending) state.value = 'saved'
        return true
      } catch (cause) {
        state.value = 'error'
        error.value = cause instanceof Error ? cause.message : 'Save failed'
        return false
      } finally {
        running = undefined
      }
    })()
    const saved = await running
    return pending ? (await persist()) && saved : saved
  }

  function schedule(patch: UpdateTaskInput) {
    clearTimeout(timer)
    pending = patch
    state.value = 'saving'
    error.value = null
    timer = setTimeout(persist, 550)
  }

  function cancel() {
    clearTimeout(timer)
    pending = undefined
  }

  onBeforeUnmount(cancel)
  return { state, error, schedule, flush: persist, cancel }
}
