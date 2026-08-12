import { parseISO } from 'date-fns'
import { createTask } from '~/data/repositories/tasksRepository'
import type { CreateTaskInput, Task } from '~/domain/entities/task'
import { dateToWeek } from '~/domain/services/week'

export function useCalendarTaskEditor(options: { sync: (task: Task) => void; today: string }) {
  const route = useRoute()
  const editorOpen = ref(false)
  const editingTask = ref<Task | null>(null)
  const editorDate = ref<string | null>(null)

  function openNew(date: string, time: string | null = null) {
    editingTask.value = null
    editorDate.value = date
    editorOpen.value = true
    if (time) sessionStorage.setItem('weekflow-calendar-create-time', time)
  }

  function openTask(task: Task, query = true) {
    editingTask.value = task
    editorDate.value = task.plannedDate || task.dueDate
    editorOpen.value = true
    if (query) void navigateTo({ query: { ...route.query, task: task.id } }, { replace: true })
  }

  function closeEditor() {
    editorOpen.value = false
    editingTask.value = null
    const query = { ...route.query }
    delete query.task
    void navigateTo({ query, replace: true })
  }

  async function createFromEditor(payload: Omit<CreateTaskInput, 'week'>) {
    const time = sessionStorage.getItem('weekflow-calendar-create-time')
    sessionStorage.removeItem('weekflow-calendar-create-time')
    options.sync(
      await createTask({
        ...payload,
        plannedDate: payload.plannedDate || editorDate.value,
        plannedTime: time || payload.plannedTime,
        week: dateToWeek(parseISO(payload.plannedDate || editorDate.value || options.today))
      })
    )
    broadcastSync('tasks')
    closeEditor()
  }

  function openFromQuery(tasks: Task[]) {
    if (typeof route.query.task !== 'string') return
    const task = tasks.find((item) => item.id === route.query.task)
    if (task) openTask(task, false)
  }

  return { editorOpen, editingTask, editorDate, openNew, openTask, closeEditor, createFromEditor, openFromQuery }
}
