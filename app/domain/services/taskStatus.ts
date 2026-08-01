import type { TaskStatus } from '../entities/task'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Зробити',
  in_progress: 'В процесі',
  done: 'Готово'
}

export function getNextStatus(current: TaskStatus): TaskStatus {
  const index = TASK_STATUSES.indexOf(current)
  return TASK_STATUSES[(index + 1) % TASK_STATUSES.length]!
}

export function getStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status]
}
