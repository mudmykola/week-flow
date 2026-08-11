import { addDays } from 'date-fns'
import type { Task, TaskPriority, TaskStatus } from '~/domain/entities/task'
import { calendarDateKey } from '#shared/utils/date'

export type TodayFilters = {
  search: string
  projectId: string | null
  priority: TaskPriority | null
  status: TaskStatus | null
  assigneeId: string | null
  topOnly: boolean
}

export function localDateKey(date = new Date()) {
  return calendarDateKey(date)
}

export function localDayRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.getTime(), end: end.getTime() - 1 }
}

export function nextWorkday(date = new Date()) {
  let next = addDays(date, 1)
  while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
  return localDateKey(next)
}

export function filterTodayTasks(tasks: Task[], filters: TodayFilters) {
  const term = filters.search.trim().toLocaleLowerCase()
  return tasks.filter(
    (task) =>
      (!term || `${task.title} ${task.note ?? ''} ${task.tags.join(' ')}`.toLocaleLowerCase().includes(term)) &&
      (!filters.projectId || task.projectId === filters.projectId) &&
      (!filters.priority || task.priority === filters.priority) &&
      (!filters.status || task.status === filters.status) &&
      (!filters.assigneeId || task.assigneeId === filters.assigneeId) &&
      (!filters.topOnly || Boolean(task.dayRank))
  )
}

export function todaySections(tasks: Task[], today: string) {
  const overdue = tasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today)
  const top = tasks
    .filter((task) => task.status !== 'done' && task.plannedDate === today && task.dayRank)
    .sort((a, b) => (a.dayRank ?? 4) - (b.dayRank ?? 4))
  const topIds = new Set(top.map((task) => task.id))
  const inProgress = tasks.filter(
    (task) => task.status === 'in_progress' && task.plannedDate === today && !topIds.has(task.id)
  )
  const planned = tasks.filter(
    (task) => task.status === 'todo' && task.plannedDate === today && !topIds.has(task.id) && !overdue.includes(task)
  )
  const done = tasks.filter((task) => task.status === 'done' && task.plannedDate === today)
  return { overdue, top, inProgress, planned, done }
}

export function todayProgress(tasks: Task[], today: string) {
  const planned = tasks.filter((task) => task.plannedDate === today)
  const done = planned.filter((task) => task.status === 'done').length
  return { total: planned.length, done, percent: planned.length ? Math.round((done / planned.length) * 100) : 0 }
}
