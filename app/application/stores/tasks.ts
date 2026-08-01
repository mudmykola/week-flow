import {
  bulkUpdateTasks,
  createTask,
  deleteTask,
  duplicateTask,
  fetchTasks,
  moveWeekTasks,
  updateTask
} from '~/data/repositories/tasksRepository'
import type { CreateTaskInput, Task, UpdateTaskInput } from '~/domain/entities/task'
import { getNextStatus } from '~/domain/services/taskStatus'
import { getNextWeek } from '~/domain/services/week'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const filterProjectId = ref<string | null>(null)

  const filteredTasks = computed(() =>
    filterProjectId.value ? tasks.value.filter((t) => t.projectId === filterProjectId.value) : tasks.value
  )

  const tasksByStatus = computed(() => ({
    todo: filteredTasks.value.filter((t) => t.status === 'todo').sort((a, b) => a.sort - b.sort),
    in_progress: filteredTasks.value.filter((t) => t.status === 'in_progress').sort((a, b) => a.sort - b.sort),
    done: filteredTasks.value.filter((t) => t.status === 'done').sort((a, b) => a.sort - b.sort)
  }))

  async function loadTasks(week: string) {
    loading.value = true
    try {
      tasks.value = await fetchTasks(week)
    } finally {
      loading.value = false
    }
  }

  async function addTask(input: CreateTaskInput) {
    const task = await createTask(input)
    tasks.value.push(task)
    return task
  }

  async function patchTask(id: string, patch: UpdateTaskInput) {
    const task = await updateTask(id, patch)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index !== -1) tasks.value[index] = task
    return task
  }

  async function cycleStatus(task: Task) {
    return patchTask(task.id, { status: getNextStatus(task.status) })
  }

  async function removeTask(id: string) {
    await deleteTask(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  async function moveIncompleteToNextWeek(fromWeek: string) {
    const toWeek = getNextWeek(fromWeek)
    const result = await moveWeekTasks(fromWeek, toWeek)
    tasks.value = tasks.value.filter((t) => t.status === 'done')
    return result
  }

  async function reorderColumn(status: Task['status'], orderedTasks: Task[]) {
    await Promise.all(
      orderedTasks.map((task, index) => {
        if (task.status === status && task.sort === index) return null
        return patchTask(task.id, { status, sort: index })
      })
    )
  }

  async function bulkPatch(ids: string[], patch: UpdateTaskInput) {
    const updated = await bulkUpdateTasks(ids, patch)
    for (const task of updated) {
      const index = tasks.value.findIndex((item) => item.id === task.id)
      if (index !== -1) tasks.value[index] = task
    }
    return updated
  }

  async function duplicate(id: string) {
    const task = await duplicateTask(id)
    tasks.value.push(task)
    return task
  }

  return {
    tasks,
    loading,
    filterProjectId,
    filteredTasks,
    tasksByStatus,
    loadTasks,
    addTask,
    patchTask,
    cycleStatus,
    removeTask,
    moveIncompleteToNextWeek,
    reorderColumn,
    bulkPatch,
    duplicate
  }
})
