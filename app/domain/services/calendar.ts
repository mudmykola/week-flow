import type { Task, TaskPriority, TaskStatus } from '~/domain/entities/task'

export type CalendarFilters = {
  projectId: string | null
  priority: TaskPriority | null
  status: TaskStatus | null
}

export function filterCalendarTasks(tasks: Task[], filters: CalendarFilters) {
  return tasks.filter(
    (task) =>
      Boolean(task.dueDate) &&
      !task.archivedAt &&
      (!filters.projectId || task.projectId === filters.projectId) &&
      (!filters.priority || task.priority === filters.priority) &&
      (!filters.status || task.status === filters.status)
  )
}

export function calendarTaskSummary(tasks: Task[], monthPrefix: string, today: string) {
  const monthTasks = tasks.filter((task) => task.dueDate?.startsWith(monthPrefix))
  return {
    total: monthTasks.length,
    open: monthTasks.filter((task) => task.status !== 'done').length,
    done: monthTasks.filter((task) => task.status === 'done').length,
    overdue: tasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length
  }
}
