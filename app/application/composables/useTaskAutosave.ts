import type { UpdateTaskInput } from '~/domain/entities/task'

export function useTaskAutosave(save: (patch: UpdateTaskInput) => Promise<void>) {
  const state = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let sequence = 0

  function schedule(patch: UpdateTaskInput) {
    clearTimeout(timer)
    const current = ++sequence
    state.value = 'saving'
    error.value = null
    timer = setTimeout(async () => {
      try {
        await save(patch)
        if (current === sequence) state.value = 'saved'
      } catch (cause) {
        if (current !== sequence) return
        state.value = 'error'
        error.value = cause instanceof Error ? cause.message : 'Save failed'
      }
    }, 550)
  }

  function cancel() {
    clearTimeout(timer)
  }

  onBeforeUnmount(cancel)
  return { state, error, schedule, cancel }
}
