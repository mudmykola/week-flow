import {
  addWeeks,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek
} from 'date-fns'
import { uk } from 'date-fns/locale'

export function weekToDate(week: string): Date {
  const [yearStr, weekStr] = week.split('-W')
  let date = setISOWeekYear(new Date(), Number(yearStr))
  date = setISOWeek(date, Number(weekStr))
  return startOfISOWeek(date)
}

function dateToWeek(date: Date): string {
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function getCurrentWeek(): string {
  return dateToWeek(new Date())
}

export function getNextWeek(week: string): string {
  return dateToWeek(addWeeks(weekToDate(week), 1))
}

export function getPrevWeek(week: string): string {
  return dateToWeek(addWeeks(weekToDate(week), -1))
}

export function getWeekLabel(week: string): string {
  const start = weekToDate(week)
  const end = endOfISOWeek(start)
  return `${format(start, 'd MMM', { locale: uk })} – ${format(end, 'd MMM yyyy', { locale: uk })}`
}
