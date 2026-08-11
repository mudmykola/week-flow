import type { Task, TaskPriority, TaskStatus } from '~/domain/entities/task'

export type CalendarFilters = {
  projectId: string | null
  priority: TaskPriority | null
  status: TaskStatus | null
  assigneeId?: string | null
}

export type CalendarPlan = {
  taskId: string
  plannedDate: string
  plannedTime: string
  estimateMinutes: number
}

export function taskCalendarDate(task: Task) {
  return task.plannedDate || task.dueDate
}

export function filterCalendarTasks(tasks: Task[], filters: CalendarFilters) {
  return tasks.filter(
    (task) =>
      Boolean(taskCalendarDate(task)) &&
      !task.archivedAt &&
      (!filters.projectId || task.projectId === filters.projectId) &&
      (!filters.priority || task.priority === filters.priority) &&
      (!filters.status || task.status === filters.status) &&
      (!filters.assigneeId || task.assigneeId === filters.assigneeId)
  )
}

export function calendarTaskSummary(tasks: Task[], monthPrefix: string, today: string) {
  const monthTasks = tasks.filter((task) => taskCalendarDate(task)?.startsWith(monthPrefix))
  return {
    total: monthTasks.length,
    open: monthTasks.filter((task) => task.status !== 'done').length,
    done: monthTasks.filter((task) => task.status === 'done').length,
    overdue: tasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length
  }
}

export function calendarMinutes(tasks: Task[]) {
  return tasks.filter((task) => task.status !== 'done').reduce((sum, task) => sum + (task.estimateMinutes || 30), 0)
}

function toMinutes(time: string | null) {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  return hours! * 60 + minutes!
}

export function conflictingTaskIds(tasks: Task[]) {
  const conflicts = new Set<string>()
  const timed = tasks.filter((task) => task.plannedTime && task.status !== 'done')
  for (let index = 0; index < timed.length; index++) {
    const left = timed[index]!
    const leftStart = toMinutes(left.plannedTime)!
    const leftEnd = leftStart + (left.estimateMinutes || 30)
    for (const right of timed.slice(index + 1)) {
      if ((left.assigneeId || 'self') !== (right.assigneeId || 'self')) continue
      const rightStart = toMinutes(right.plannedTime)!
      const rightEnd = rightStart + (right.estimateMinutes || 30)
      if (leftStart < rightEnd && rightStart < leftEnd) {
        conflicts.add(left.id)
        conflicts.add(right.id)
      }
    }
  }
  return conflicts
}

export function buildSmartSchedule(tasks: Task[], days: string[], capacityMinutes = 8 * 60): CalendarPlan[] {
  const used = new Map(days.map((day) => [day, calendarMinutes(tasks.filter((task) => task.plannedDate === day))]))
  const priority = { urgent: 0, high: 1, medium: 2, low: 3 }
  const candidates = tasks
    .filter((task) => !task.archivedAt && task.status !== 'done' && !task.plannedDate && !task.blockedByTaskId)
    .sort(
      (left, right) =>
        priority[left.priority] - priority[right.priority] ||
        (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')
    )
  const result: CalendarPlan[] = []
  for (const task of candidates) {
    const estimate = task.estimateMinutes || 30
    const day = days.find((value) => (used.get(value) || 0) + estimate <= capacityMinutes)
    if (!day) continue
    const offset = used.get(day) || 0
    const start = 9 * 60 + offset
    result.push({
      taskId: task.id,
      plannedDate: day,
      plannedTime: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
      estimateMinutes: estimate
    })
    used.set(day, offset + estimate)
  }
  return result
}
