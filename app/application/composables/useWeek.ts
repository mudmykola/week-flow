import { getCurrentWeek, getNextWeek, getPrevWeek, getWeekLabel } from '~/domain/services/week'

export function useWeek() {
  const week = ref(getCurrentWeek())
  const label = computed(() => getWeekLabel(week.value))
  const isCurrentWeek = computed(() => week.value === getCurrentWeek())

  function next() {
    week.value = getNextWeek(week.value)
  }

  function prev() {
    week.value = getPrevWeek(week.value)
  }

  function goToCurrent() {
    week.value = getCurrentWeek()
  }

  return { week, label, isCurrentWeek, next, prev, goToCurrent }
}
