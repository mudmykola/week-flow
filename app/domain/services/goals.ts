import type { Goal } from '~/domain/entities/goal'

const DUE_SOON_MS = 3 * 86_400_000

export function isGoalOverdue(goal: Goal, today = Date.now()): boolean {
  if (goal.status === 'done' || !goal.dueDate) return false
  return new Date(goal.dueDate).getTime() < today
}

export function isGoalDueSoon(goal: Goal, today = Date.now()): boolean {
  if (goal.status === 'done' || !goal.dueDate) return false
  const due = new Date(goal.dueDate).getTime()
  return due >= today && due - today <= DUE_SOON_MS
}

export function sortGoalsForDisplay(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
}
