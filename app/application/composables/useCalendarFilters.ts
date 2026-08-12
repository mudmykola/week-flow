import type { TaskPriority, TaskStatus } from '~/domain/entities/task'

export type CalendarFilters = {
  projectId: string | null
  priority: TaskPriority | null
  status: TaskStatus | null
  assigneeId: string | null
}

export function useCalendarFilters() {
  const filters = useLocalStorage<CalendarFilters>('weekflow-calendar-filters-v3', {
    projectId: null,
    priority: null,
    status: null,
    assigneeId: null
  })
  const hasFilters = computed(() => Object.values(filters.value).some(Boolean))

  function clearFilters() {
    Object.assign(filters.value, { projectId: null, priority: null, status: null, assigneeId: null })
  }

  return { filters, hasFilters, clearFilters }
}
