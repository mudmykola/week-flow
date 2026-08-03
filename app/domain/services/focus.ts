export type FocusKind = 'focus' | 'short_break' | 'long_break'
export interface FocusSession {
  id: string
  taskId: string | null
  taskTitle?: string | null
  kind: FocusKind
  status: 'active' | 'completed' | 'interrupted'
  plannedSeconds: number
  elapsedSeconds: number
  note: string | null
  result: string | null
  startedAt: number
  endedAt: number | null
}

export function focusRemaining(startedAt: number, remainingAtStart: number, now: number, running: boolean) {
  return running ? Math.max(0, remainingAtStart - Math.floor((now - startedAt) / 1000)) : remainingAtStart
}

export function focusStats(sessions: FocusSession[], now = Date.now()) {
  const completed = sessions.filter((item) => item.kind === 'focus' && item.status === 'completed')
  const dayKey = (value: number) => new Date(value).toISOString().slice(0, 10)
  const today = dayKey(now)
  const minutesToday = Math.round(
    completed.filter((item) => dayKey(item.startedAt) === today).reduce((sum, item) => sum + item.elapsedSeconds, 0) /
      60
  )
  const days = new Set(completed.map((item) => dayKey(item.startedAt)))
  let streak = 0
  const cursor = new Date(`${today}T12:00:00Z`)
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (6 - index))
    const key = dayKey(date.getTime())
    return {
      key,
      minutes: Math.round(
        completed.filter((item) => dayKey(item.startedAt) === key).reduce((sum, item) => sum + item.elapsedSeconds, 0) /
          60
      )
    }
  })
  return {
    minutesToday,
    completedToday: completed.filter((item) => dayKey(item.startedAt) === today).length,
    streak,
    week
  }
}
