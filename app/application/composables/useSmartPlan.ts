import { parseISO } from 'date-fns'
import { updateTask } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
import { buildSmartSchedule, type CalendarPlan } from '~/domain/services/calendar'
import { dateToWeek } from '~/domain/services/week'

export function useSmartPlan(options: {
  calendarTasks: ComputedRef<Task[]>
  weekDateKeys: ComputedRef<string[]>
  sync: (task: Task) => void
  saving: Ref<boolean>
}) {
  const smartOpen = ref(false)
  const smartPlan = ref<CalendarPlan[]>([])

  function prepareSmartPlan() {
    smartPlan.value = buildSmartSchedule(
      options.calendarTasks.value,
      options.weekDateKeys.value.filter((_, index) => index < 5)
    )
    smartOpen.value = true
  }

  async function applySmartPlan() {
    options.saving.value = true
    try {
      const updated = await Promise.all(
        smartPlan.value.map((plan) =>
          updateTask(plan.taskId, {
            plannedDate: plan.plannedDate,
            plannedTime: plan.plannedTime,
            estimateMinutes: plan.estimateMinutes,
            week: dateToWeek(parseISO(plan.plannedDate))
          })
        )
      )
      updated.forEach(options.sync)
      smartOpen.value = false
      broadcastSync('tasks')
    } finally {
      options.saving.value = false
    }
  }

  return { smartOpen, smartPlan, prepareSmartPlan, applySmartPlan }
}
