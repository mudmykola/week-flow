import type { TaskPriority, TaskStatus } from '../entities/task'

export const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'Терміновий',
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький'
}

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'Зробити',
  in_progress: 'В процесі',
  done: 'Готово'
}

export const priorityColors: Record<TaskPriority, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#94a3b8'
}
