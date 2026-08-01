import type { CreateTaskInput, Task, UpdateTaskInput } from '~/domain/entities/task'

export function fetchTasks(week: string, projectId?: string | null) {
  return $fetch<Task[]>('/api/tasks', {
    query: { week, project: projectId || undefined }
  })
}

export function fetchAllTasks() {
  return $fetch<Task[]>('/api/tasks')
}

export function createTask(input: CreateTaskInput) {
  return $fetch<Task>('/api/tasks', { method: 'POST', body: input })
}

export function updateTask(id: string, patch: UpdateTaskInput) {
  return $fetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: patch })
}

export function deleteTask(id: string) {
  return $fetch<{ ok: true }>(`/api/tasks/${id}`, { method: 'DELETE' })
}

export function moveWeekTasks(fromWeek: string, toWeek: string) {
  return $fetch<{ moved: number }>('/api/tasks/move-week', {
    method: 'POST',
    body: { fromWeek, toWeek }
  })
}
