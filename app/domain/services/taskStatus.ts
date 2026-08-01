import type { TaskStatus } from '../entities/task'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'task.statusValue.todo',
  in_progress: 'task.statusValue.in_progress',
  done: 'task.statusValue.done'
}

export function getNextStatus(current: TaskStatus): TaskStatus {
  const index = TASK_STATUSES.indexOf(current)
  return TASK_STATUSES[(index + 1) % TASK_STATUSES.length]!
}

export function getStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status]
}
