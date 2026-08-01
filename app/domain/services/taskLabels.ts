import type { TaskPriority, TaskStatus } from '../entities/task'

export const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'task.priorityValue.urgent',
  high: 'task.priorityValue.high',
  medium: 'task.priorityValue.medium',
  low: 'task.priorityValue.low'
}

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'task.statusValue.todo',
  in_progress: 'task.statusValue.in_progress',
  done: 'task.statusValue.done'
}

export const priorityColors: Record<TaskPriority, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#94a3b8'
}
