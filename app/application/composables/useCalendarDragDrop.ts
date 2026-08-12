import { parseISO } from 'date-fns'
import type { Task, UpdateTaskInput } from '~/domain/entities/task'
import { dateToWeek } from '~/domain/services/week'

export function useCalendarDragDrop(options: {
  tasks: Ref<Task[]>
  patchTask: (task: Task, patch: UpdateTaskInput, label?: string) => Promise<void>
}) {
  const { t } = useI18n()
  const draggingId = ref<string | null>(null)

  function drag(task: Task) {
    draggingId.value = task.id
  }

  async function drop(date: string, time: string | null = null) {
    const task = options.tasks.value.find((item) => item.id === draggingId.value)
    draggingId.value = null
    if (task)
      await options.patchTask(task, {
        plannedDate: date,
        plannedTime: time ?? task.plannedTime,
        week: dateToWeek(parseISO(date))
      })
  }

  async function unschedule() {
    const task = options.tasks.value.find((item) => item.id === draggingId.value)
    draggingId.value = null
    if (task)
      await options.patchTask(task, { plannedDate: null, plannedTime: null }, t('pages.calendar.unscheduledDone'))
  }

  return { draggingId, drag, drop, unschedule }
}
