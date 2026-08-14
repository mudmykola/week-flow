import type { FocusKind } from '~/domain/services/focus'
import { focusRemaining } from '~/domain/services/focus'

interface FocusTimerState {
  sessionId: string | null
  taskId: string | null
  taskTitle: string
  kind: FocusKind
  duration: number
  remainingAtStart: number
  startedAt: number
  running: boolean
}

function createFocusTimer() {
  const state = useLocalStorage<FocusTimerState>('weekflow-focus-timer-v2', {
    sessionId: null,
    taskId: null,
    taskTitle: '',
    kind: 'focus',
    duration: 1500,
    remainingAtStart: 1500,
    startedAt: Date.now(),
    running: false
  })
  const now = ref(Date.now())
  const finishing = ref(false)
  useIntervalFn(() => {
    now.value = Date.now()
    if (state.value.running && seconds.value === 0) void finish('completed')
  }, 500)
  const active = computed(() => Boolean(state.value.sessionId))
  const seconds = computed(() =>
    focusRemaining(state.value.startedAt, state.value.remainingAtStart, now.value, state.value.running)
  )
  const progress = computed(() => (state.value.duration ? 1 - seconds.value / state.value.duration : 0))
  const display = computed(
    () => `${String(Math.floor(seconds.value / 60)).padStart(2, '0')}:${String(seconds.value % 60).padStart(2, '0')}`
  )

  function start(input: {
    sessionId: string
    taskId: string | null
    taskTitle: string
    kind: FocusKind
    duration: number
  }) {
    state.value = { ...input, remainingAtStart: input.duration, startedAt: Date.now(), running: true }
    now.value = Date.now()
  }
  function pause() {
    state.value = { ...state.value, remainingAtStart: seconds.value, running: false }
  }
  function resume() {
    if (!active.value || seconds.value <= 0) return
    state.value = { ...state.value, remainingAtStart: seconds.value, startedAt: Date.now(), running: true }
  }
  function reset() {
    state.value = { ...state.value, remainingAtStart: state.value.duration, startedAt: Date.now(), running: false }
  }
  function clear() {
    state.value = {
      sessionId: null,
      taskId: null,
      taskTitle: '',
      kind: 'focus',
      duration: 1500,
      remainingAtStart: 1500,
      startedAt: Date.now(),
      running: false
    }
  }
  async function finish(status: 'completed' | 'interrupted', note?: string, result?: string) {
    if (!state.value.sessionId || finishing.value) return
    finishing.value = true
    const snapshot = { ...state.value }
    try {
      await $fetch(`/api/focus/${snapshot.sessionId}`, {
        method: 'PATCH',
        body: {
          status,
          elapsedSeconds: snapshot.duration - seconds.value,
          note: note || undefined,
          result: result || undefined
        }
      })
      if (status === 'completed' && import.meta.client && Notification.permission === 'granted') {
        new Notification(snapshot.kind === 'focus' ? 'WeekFlow · Focus complete' : 'WeekFlow · Break complete')
      }
      state.value = { ...snapshot, sessionId: null, running: false, remainingAtStart: 0 }
    } finally {
      finishing.value = false
    }
  }
  return { state, active, seconds, progress, display, finishing, start, pause, resume, reset, clear, finish }
}

export const useFocusTimer = createSharedComposable(createFocusTimer)
