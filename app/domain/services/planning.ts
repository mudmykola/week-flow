import { addDays, format } from 'date-fns'
import type { Task } from '~/domain/entities/task'
import { weekToDate } from '~/domain/services/week'

const priorityWeight: Record<Task['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export interface CapacityDay {
  date: string
  tasks: Task[]
  plannedMinutes: number
  unknownEstimates: number
  capacityMinutes: number
  utilization: number
  overloaded: boolean
}

export function taskPlanningMinutes(task: Task): number {
  if (task.status === 'done' && task.actualMinutes) return task.actualMinutes
  return task.estimateMinutes ?? 0
}

export function backlogTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => !task.archivedAt && task.status !== 'done' && task.workState !== 'cancelled' && !task.plannedDate)
    .sort((left, right) => {
      const priority = priorityWeight[left.priority] - priorityWeight[right.priority]
      if (priority) return priority
      const dueDate = (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')
      return dueDate || left.createdAt - right.createdAt
    })
}

export function buildCapacityDays(tasks: Task[], week: string, capacityMinutes: number): CapacityDay[] {
  const start = weekToDate(week)
  return Array.from({ length: 5 }, (_, index) => {
    const date = format(addDays(start, index), 'yyyy-MM-dd')
    const dayTasks = tasks
      .filter((task) => !task.archivedAt && task.workState !== 'cancelled' && task.plannedDate === date)
      .sort((left, right) => (left.plannedTime || '99:99').localeCompare(right.plannedTime || '99:99'))
    const plannedMinutes = dayTasks.reduce((total, task) => total + taskPlanningMinutes(task), 0)
    return {
      date,
      tasks: dayTasks,
      plannedMinutes,
      unknownEstimates: dayTasks.filter((task) => !task.estimateMinutes && !task.actualMinutes).length,
      capacityMinutes,
      utilization: capacityMinutes ? Math.round((plannedMinutes / capacityMinutes) * 100) : 0,
      overloaded: plannedMinutes > capacityMinutes
    }
  })
}

export function buildCapacityPlan(backlog: Task[], days: CapacityDay[], earliestDate: string) {
  const remaining = new Map(days.map((day) => [day.date, Math.max(0, day.capacityMinutes - day.plannedMinutes)]))
  const result: Array<{ taskId: string; plannedDate: string }> = []

  for (const task of backlog) {
    const estimate = task.estimateMinutes
    if (!estimate) continue
    const day = days.find(
      (candidate) => candidate.date >= earliestDate && (remaining.get(candidate.date) || 0) >= estimate
    )
    if (!day) continue
    result.push({ taskId: task.id, plannedDate: day.date })
    remaining.set(day.date, (remaining.get(day.date) || 0) - estimate)
  }

  return result
}
