import type { Task, TaskPriority, TaskStatus } from '~/domain/entities/task'
import { getPrevWeek } from '~/domain/services/week'

export type AnalyticsPeriod = '8w' | 'all'

export interface AnalyticsFilters {
  period: AnalyticsPeriod
  projectId: string | null
  assigneeId: string | null
  priority: TaskPriority | null
}

export interface AnalyticsTrendPoint {
  week: string
  label: string
  created: number
  done: number
  overdue: number
  completion: number
}

export function filterAnalyticsTasks(tasks: Task[], filters: Omit<AnalyticsFilters, 'period'>) {
  return tasks.filter(
    (task) =>
      !task.archivedAt &&
      (!filters.projectId || task.projectId === filters.projectId) &&
      (!filters.assigneeId || task.assigneeId === filters.assigneeId) &&
      (!filters.priority || task.priority === filters.priority)
  )
}

export function analyticsWeeks(tasks: Task[], currentWeek: string, period: AnalyticsPeriod) {
  if (period === 'all') return [...new Set(tasks.map((task) => task.week))].sort()

  const weeks: string[] = []
  let cursor = currentWeek
  for (let index = 0; index < 8; index += 1) {
    weeks.unshift(cursor)
    cursor = getPrevWeek(cursor)
  }
  return weeks
}

export function buildAnalyticsTrend(tasks: Task[], weeks: string[], today: string): AnalyticsTrendPoint[] {
  return weeks.map((week) => {
    const weekTasks = tasks.filter((task) => task.week === week)
    const done = weekTasks.filter((task) => task.status === 'done').length
    const overdue = weekTasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length
    return {
      week,
      label: week.replace(/^\d{4}-W/, 'W'),
      created: weekTasks.length,
      done,
      overdue,
      completion: weekTasks.length ? Math.round((done / weekTasks.length) * 100) : 0
    }
  })
}

export function countByStatus(tasks: Task[]): Record<TaskStatus, number> {
  return {
    todo: tasks.filter((task) => task.status === 'todo').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length
  }
}

export function completionRate(tasks: Task[]) {
  if (!tasks.length) return 0
  return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100)
}
