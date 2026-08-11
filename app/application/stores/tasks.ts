import {
  bulkUpdateTasks,
  createTask,
  deleteTask,
  duplicateTask,
  fetchInboxTasks,
  fetchTasks,
  moveWeekTasks,
  updateTask
} from '~/data/repositories/tasksRepository'
import type { CreateTaskInput, Task, UpdateTaskInput } from '~/domain/entities/task'
import { isInboxTask } from '~/domain/services/inbox'
import { getNextStatus } from '~/domain/services/taskStatus'
import { getNextWeek } from '~/domain/services/week'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const filterProjectId = ref<string | null>(null)
  const inboxTasks = ref<Task[]>([])
  const inboxLoading = ref(false)
  const listTasks = ref<Task[]>([])
  const listLoading = ref(false)

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
    broadcastSync('tasks')
    return task
  }

  async function patchTask(id: string, patch: UpdateTaskInput) {
    const index = tasks.value.findIndex((t) => t.id === id)
    const previous = index === -1 ? null : { ...tasks.value[index]! }
    if (index !== -1) tasks.value[index] = { ...tasks.value[index]!, ...patch }
    try {
      const task = await updateTask(id, patch)
      const currentIndex = tasks.value.findIndex((t) => t.id === id)
      if (currentIndex !== -1) tasks.value[currentIndex] = task
      broadcastSync('tasks')
      return task
    } catch (error) {
      const currentIndex = tasks.value.findIndex((t) => t.id === id)
      if (previous && currentIndex !== -1) tasks.value[currentIndex] = previous
      throw error
    }
  }

  async function cycleStatus(task: Task) {
    return patchTask(task.id, { status: getNextStatus(task.status) })
  }

  async function removeTask(id: string) {
    const previous = tasks.value
    tasks.value = tasks.value.filter((t) => t.id !== id)
    try {
      await deleteTask(id)
      broadcastSync('tasks')
    } catch (error) {
      tasks.value = previous
      throw error
    }
  }

  async function moveIncompleteToNextWeek(fromWeek: string) {
    const toWeek = getNextWeek(fromWeek)
    const result = await moveWeekTasks(fromWeek, toWeek)
    tasks.value = tasks.value.filter((t) => t.status === 'done')
    broadcastSync('tasks')
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
    broadcastSync('tasks')
    return updated
  }

  async function duplicate(id: string) {
    const task = await duplicateTask(id)
    tasks.value.push(task)
    broadcastSync('tasks')
    return task
  }

  async function loadInboxTasks() {
    inboxLoading.value = true
    try {
      inboxTasks.value = await fetchInboxTasks()
    } finally {
      inboxLoading.value = false
    }
  }

  async function addInboxTask(input: CreateTaskInput) {
    const task = await createTask(input)
    inboxTasks.value.unshift(task)
    broadcastSync('tasks')
    return task
  }

  async function patchInboxTask(id: string, patch: UpdateTaskInput) {
    const index = inboxTasks.value.findIndex((t) => t.id === id)
    const previous = index === -1 ? null : { ...inboxTasks.value[index]! }
    if (index !== -1) inboxTasks.value[index] = { ...inboxTasks.value[index]!, ...patch }
    try {
      const task = await updateTask(id, patch)
      const currentIndex = inboxTasks.value.findIndex((t) => t.id === id)
      if (currentIndex !== -1) {
        if (isInboxTask(task)) inboxTasks.value[currentIndex] = task
        else inboxTasks.value.splice(currentIndex, 1)
      }
      broadcastSync('tasks')
      return task
    } catch (error) {
      const currentIndex = inboxTasks.value.findIndex((t) => t.id === id)
      if (previous && currentIndex !== -1) inboxTasks.value[currentIndex] = previous
      throw error
    }
  }

  async function removeInboxTask(id: string) {
    const previous = inboxTasks.value
    inboxTasks.value = inboxTasks.value.filter((t) => t.id !== id)
    try {
      await deleteTask(id)
      broadcastSync('tasks')
    } catch (error) {
      inboxTasks.value = previous
      throw error
    }
  }

  function syncInboxTaskFromEditor(task: Task) {
    const index = inboxTasks.value.findIndex((t) => t.id === task.id)
    if (isInboxTask(task)) {
      if (index !== -1) inboxTasks.value[index] = task
      else inboxTasks.value.unshift(task)
    } else if (index !== -1) {
      inboxTasks.value.splice(index, 1)
    }
  }

  async function restoreCompletedInboxTask(task: Task) {
    const restored = await updateTask(task.id, { status: task.status })
    inboxTasks.value.unshift(restored)
    broadcastSync('tasks')
    return restored
  }

  async function recreateInboxTask(task: Task) {
    const recreated = await createTask({
      title: task.title,
      note: task.note,
      status: task.status,
      projectId: task.projectId,
      week: task.week,
      sort: task.sort,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags,
      recurrence: task.recurrence,
      assigneeId: task.assigneeId,
      stageId: task.stageId
    })
    inboxTasks.value.unshift(recreated)
    broadcastSync('tasks')
    return recreated
  }

  async function loadListTasks(fetcher: () => Promise<Task[]>) {
    listLoading.value = true
    try {
      listTasks.value = await fetcher()
    } finally {
      listLoading.value = false
    }
  }

  async function addListTask(input: CreateTaskInput) {
    const task = await createTask(input)
    listTasks.value.unshift(task)
    broadcastSync('tasks')
    return task
  }

  async function patchListTask(id: string, patch: UpdateTaskInput) {
    const index = listTasks.value.findIndex((t) => t.id === id)
    const previous = index === -1 ? null : { ...listTasks.value[index]! }
    if (index !== -1) listTasks.value[index] = { ...listTasks.value[index]!, ...patch }
    try {
      const task = await updateTask(id, patch)
      const currentIndex = listTasks.value.findIndex((t) => t.id === id)
      if (currentIndex !== -1) listTasks.value[currentIndex] = task
      broadcastSync('tasks')
      return task
    } catch (error) {
      const currentIndex = listTasks.value.findIndex((t) => t.id === id)
      if (previous && currentIndex !== -1) listTasks.value[currentIndex] = previous
      throw error
    }
  }

  async function removeListTask(id: string) {
    const previous = listTasks.value
    listTasks.value = listTasks.value.filter((t) => t.id !== id)
    try {
      await deleteTask(id)
      broadcastSync('tasks')
    } catch (error) {
      listTasks.value = previous
      throw error
    }
  }

  async function recreateListTask(task: Task) {
    const recreated = await createTask({
      title: task.title,
      note: task.note,
      status: task.status,
      projectId: task.projectId,
      week: task.week,
      sort: task.sort,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags,
      recurrence: task.recurrence,
      assigneeId: task.assigneeId,
      stageId: task.stageId
    })
    listTasks.value.unshift(recreated)
    broadcastSync('tasks')
    return recreated
  }

  function syncListTask(task: Task) {
    const index = listTasks.value.findIndex((t) => t.id === task.id)
    if (index !== -1) listTasks.value[index] = task
    else listTasks.value.unshift(task)
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
    duplicate,
    inboxTasks,
    inboxLoading,
    loadInboxTasks,
    addInboxTask,
    patchInboxTask,
    removeInboxTask,
    syncInboxTaskFromEditor,
    restoreCompletedInboxTask,
    recreateInboxTask,
    listTasks,
    listLoading,
    loadListTasks,
    addListTask,
    patchListTask,
    removeListTask,
    recreateListTask,
    syncListTask
  }
})
