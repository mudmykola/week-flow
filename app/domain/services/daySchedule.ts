import type { Task } from '~/domain/entities/task'
import type { DaySchedule } from '#shared/types/daySchedule'

export type TimeZoneKey = 'morning' | 'midday' | 'afternoon' | 'outside' | 'unscheduled'
export interface DayTimeZone {
  key: TimeZoneKey
  start: string | null
  end: string | null
  capacityMinutes: number
  plannedMinutes: number
  tasks: Task[]
}
export function timeToMinutes(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return hours * 60 + minutes
}
export function minutesToTime(value: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, value))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}
function overlap(start: number, end: number, breakStart: number, breakEnd: number) {
  return Math.max(0, Math.min(end, breakEnd) - Math.max(start, breakStart))
}
export function buildDayTimeZones(tasks: Task[], date: string, schedule: DaySchedule): DayTimeZone[] {
  const bounds = [schedule.workStart, schedule.morningEnd, schedule.middayEnd, schedule.workEnd].map(timeToMinutes)
  const lunchStart = timeToMinutes(schedule.lunchStart)
  const lunchEnd = lunchStart + schedule.lunchMinutes
  const planned = tasks.filter((task) => task.plannedDate === date && task.status !== 'done' && !task.archivedAt)
  const definitions: Array<[Exclude<TimeZoneKey, 'unscheduled'>, number, number]> = [
    ['morning', bounds[0]!, bounds[1]!],
    ['midday', bounds[1]!, bounds[2]!],
    ['afternoon', bounds[2]!, bounds[3]!]
  ]
  const zones = definitions.map(([key, start, end]) => {
    const zoneTasks = planned.filter(
      (task) => task.plannedTime && timeToMinutes(task.plannedTime) >= start && timeToMinutes(task.plannedTime) < end
    )
    return {
      key,
      start: minutesToTime(start),
      end: minutesToTime(end),
      capacityMinutes: Math.max(0, end - start - overlap(start, end, lunchStart, lunchEnd)),
      plannedMinutes: zoneTasks.reduce((sum, task) => sum + (task.estimateMinutes || 25), 0),
      tasks: zoneTasks.sort((a, b) => (a.plannedTime || '').localeCompare(b.plannedTime || ''))
    } satisfies DayTimeZone
  })
  const assigned = new Set(zones.flatMap((zone) => zone.tasks.map((task) => task.id)))
  const outside = planned.filter((task) => task.plannedTime && !assigned.has(task.id))
  const unscheduled = planned.filter((task) => !task.plannedTime)
  return [
    ...zones,
    {
      key: 'outside',
      start: null,
      end: null,
      capacityMinutes: 0,
      plannedMinutes: outside.reduce((sum, task) => sum + (task.estimateMinutes || 25), 0),
      tasks: outside
    },
    {
      key: 'unscheduled',
      start: null,
      end: null,
      capacityMinutes: 0,
      plannedMinutes: unscheduled.reduce((sum, task) => sum + (task.estimateMinutes || 25), 0),
      tasks: unscheduled
    }
  ]
}
const priorityWeight: Record<Task['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 }
export function autoPlanDay(tasks: Task[], date: string, schedule: DaySchedule) {
  const lunchStart = timeToMinutes(schedule.lunchStart)
  const lunchEnd = lunchStart + schedule.lunchMinutes
  const workEnd = timeToMinutes(schedule.workEnd)
  let cursor = timeToMinutes(schedule.workStart)
  return tasks
    .filter((task) => task.plannedDate === date && task.status !== 'done' && !task.archivedAt && !task.plannedTime)
    .sort((a, b) => (a.dayRank || 4) - (b.dayRank || 4) || priorityWeight[a.priority] - priorityWeight[b.priority])
    .map((task) => {
      const duration = task.estimateMinutes || 25
      if (cursor < lunchEnd && cursor + duration > lunchStart) cursor = lunchEnd
      if (cursor + duration > workEnd) return { id: task.id, plannedTime: null }
      const plannedTime = minutesToTime(cursor)
      cursor += duration
      return { id: task.id, plannedTime }
    })
}

export function nextZoneTime(zone: DayTimeZone, schedule: DaySchedule) {
  if (!zone.start) return null
  let value = timeToMinutes(zone.start) + zone.plannedMinutes
  const lunchStart = timeToMinutes(schedule.lunchStart)
  const lunchEnd = lunchStart + schedule.lunchMinutes
  if (value >= lunchStart && value < lunchEnd) value = lunchEnd
  return minutesToTime(Math.min(value, timeToMinutes(zone.end!) - 1))
}
