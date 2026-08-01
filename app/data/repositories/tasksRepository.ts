import type { CreateTaskInput, Task, UpdateTaskInput } from '~/domain/entities/task'
import { apiRequest } from '~/data/http/apiClient'

export function fetchTasks(week: string, projectId?: string | null) {
  return apiRequest<Task[]>('/api/tasks', {
    query: { week, project: projectId || undefined }
  })
}

export function fetchAllTasks() {
  return apiRequest<Task[]>('/api/tasks')
}

export function createTask(input: CreateTaskInput) {
  return apiRequest<Task>('/api/tasks', { method: 'POST', body: input })
}

export function updateTask(id: string, patch: UpdateTaskInput) {
  return apiRequest<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: patch })
}

export function deleteTask(id: string) {
  return apiRequest<{ ok: true }>(`/api/tasks/${id}`, { method: 'DELETE' })
}

export function moveWeekTasks(fromWeek: string, toWeek: string) {
  return apiRequest<{ moved: number }>('/api/tasks/move-week', {
    method: 'POST',
    body: { fromWeek, toWeek }
  })
}

export function bulkUpdateTasks(ids: string[], patch: UpdateTaskInput) {
  return apiRequest<Task[]>('/api/tasks/bulk', { method: 'PATCH', body: { ids, patch } })
}

export function duplicateTask(id: string) {
  return apiRequest<Task>(`/api/tasks/${id}/duplicate`, { method: 'POST' })
}
