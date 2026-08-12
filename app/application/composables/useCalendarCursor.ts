import {
  addDays,
  addMonths,
  endOfISOWeek,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfISOWeek,
  startOfMonth,
  subMonths
} from 'date-fns'
import { enUS, uk } from 'date-fns/locale'
import type { Task } from '~/domain/entities/task'
import { localDateKey } from '~/domain/services/today'

export type CalendarView = 'month' | 'week' | 'agenda'

export function useCalendarCursor(options: {
  view: Ref<CalendarView>
  tasksByDate: ComputedRef<Partial<Record<string, Task[]>>>
}) {
  const { locale, rt, tm } = useI18n()
  const today = localDateKey()
  const cursor = ref(startOfMonth(new Date()))
  const selectedDate = ref(today)
  const dateLocale = computed(() => (locale.value === 'en' ? enUS : uk))

  const monthDates = computed(() => {
    const dates: Date[] = []
    for (
      let date = startOfISOWeek(startOfMonth(cursor.value));
      date <= endOfISOWeek(endOfMonth(cursor.value));
      date = addDays(date, 1)
    )
      dates.push(date)
    return dates
  })
  const weekStart = computed(() => startOfISOWeek(parseISO(selectedDate.value)))
  const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart.value, index)))
  const weekDateKeys = computed(() => weekDays.value.map((date) => format(date, 'yyyy-MM-dd')))
  const agendaDays = computed(() => {
    const start =
      options.view.value === 'agenda' ? startOfISOWeek(parseISO(selectedDate.value)) : startOfMonth(cursor.value)
    const length = options.view.value === 'agenda' ? 14 : 31
    return Array.from({ length }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd')).filter(
      (date) => options.tasksByDate.value[date]?.length
    )
  })
  const monthPrefix = computed(() => format(cursor.value, 'yyyy-MM'))
  const title = computed(() =>
    options.view.value === 'week'
      ? `${format(weekStart.value, 'd MMM', { locale: dateLocale.value })} — ${format(addDays(weekStart.value, 6), 'd MMM yyyy', { locale: dateLocale.value })}`
      : format(cursor.value, 'LLLL yyyy', { locale: dateLocale.value })
  )
  const weekdays = computed(() =>
    (tm('pages.calendar.weekdays') as Array<Parameters<typeof rt>[0]>).map((day) => rt(day))
  )

  function dateLabel(date: string, pattern = 'EEEE, d MMMM') {
    return format(parseISO(date), pattern, { locale: dateLocale.value })
  }
  function goToday() {
    selectedDate.value = today
    cursor.value = startOfMonth(new Date())
  }
  function changePeriod(step: number) {
    if (options.view.value === 'week' || options.view.value === 'agenda')
      selectedDate.value = format(addDays(parseISO(selectedDate.value), step * 7), 'yyyy-MM-dd')
    else cursor.value = step > 0 ? addMonths(cursor.value, 1) : subMonths(cursor.value, 1)
  }
  function selectDate(date: string) {
    selectedDate.value = date
    const parsed = parseISO(date)
    if (!isSameMonth(parsed, cursor.value)) cursor.value = startOfMonth(parsed)
  }
  function moveSelected(event: KeyboardEvent, amount: number) {
    if ((event.target as HTMLElement | null)?.matches('input, textarea, select, [contenteditable="true"]')) return
    event.preventDefault()
    selectDate(format(addDays(parseISO(selectedDate.value), amount), 'yyyy-MM-dd'))
  }

  return {
    today,
    cursor,
    selectedDate,
    dateLocale,
    monthDates,
    weekStart,
    weekDays,
    weekDateKeys,
    agendaDays,
    monthPrefix,
    title,
    weekdays,
    dateLabel,
    goToday,
    changePeriod,
    selectDate,
    moveSelected
  }
}
