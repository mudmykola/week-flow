import type { Task } from '~/domain/entities/task'

export function isInboxTask(task: Task): boolean {
  return !task.projectId && !task.dueDate && task.status !== 'done' && !task.archivedAt
}
