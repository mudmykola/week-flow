import type { Subtask, Task } from '~/domain/entities/task'
import { localDateKey } from './today'

export type TaskHealthIssue =
  | 'missingDescription'
  | 'missingAssignee'
  | 'missingDate'
  | 'missingEstimate'
  | 'blocked'
  | 'overdue'
  | 'frequentlyRescheduled'
  | 'tooLarge'
  | 'readyIncomplete'
  | 'doneIncomplete'

export function taskHealth(task: Task, subtasks: Subtask[] = [], today = localDateKey()) {
  const issues: TaskHealthIssue[] = []
  if (!task.note?.trim()) issues.push('missingDescription')
  if (!task.assigneeId) issues.push('missingAssignee')
  if (!task.dueDate && !task.plannedDate) issues.push('missingDate')
  if (!task.estimateMinutes) issues.push('missingEstimate')
  if (task.blockedByTaskId || task.workState === 'waiting') issues.push('blocked')
  if (task.status !== 'done' && task.dueDate && task.dueDate < today) issues.push('overdue')
  if (task.rescheduleCount >= 3) issues.push('frequentlyRescheduled')
  if ((task.estimateMinutes || 0) > 480 || subtasks.length > 20) issues.push('tooLarge')
  if (task.status === 'in_progress' && !task.readyCriteria.length) issues.push('readyIncomplete')
  if (task.status === 'done' && task.doneCriteria.length && subtasks.some((item) => !item.done))
    issues.push('doneIncomplete')
  return { score: Math.max(0, 100 - issues.length * 12), issues }
}

export function taskNextAction(task: Task, subtasks: Subtask[] = [], today = localDateKey()) {
  if (task.status === 'done') return { kind: 'done', label: 'task.guidance.done', icon: 'i-lucide-circle-check-big' }
  if (task.workState === 'review')
    return { kind: 'review', label: 'task.guidance.review', icon: 'i-lucide-scan-search' }
  if (task.workState === 'waiting' || task.blockedByTaskId)
    return { kind: 'waiting', label: 'task.guidance.waiting', icon: 'i-lucide-hourglass' }
  if (!task.assigneeId) return { kind: 'assignee', label: 'task.guidance.assign', icon: 'i-lucide-user-plus' }
  if (!task.plannedDate) return { kind: 'plan', label: 'task.guidance.plan', icon: 'i-lucide-calendar-plus' }
  if (task.dueDate && task.dueDate < today)
    return { kind: 'overdue', label: 'task.guidance.overdue', icon: 'i-lucide-triangle-alert' }
  const next = subtasks.find((item) => !item.done)
  if (next)
    return { kind: 'subtask', label: 'task.guidance.nextSubtask', icon: 'i-lucide-list-checks', detail: next.title }
  if (task.status === 'todo') return { kind: 'start', label: 'task.guidance.start', icon: 'i-lucide-play' }
  return { kind: 'complete', label: 'task.guidance.complete', icon: 'i-lucide-check' }
}

export function taskTimeProgress(task: Task, focusMinutes = 0) {
  const actual = task.actualMinutes ?? focusMinutes
  const estimate = task.estimateMinutes || 0
  return {
    actual,
    estimate,
    percent: estimate ? Math.round((actual / estimate) * 100) : 0,
    overrun: Boolean(estimate && actual > estimate)
  }
}
