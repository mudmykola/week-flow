import { apiRequest } from '~/data/http/apiClient'
import type { SaveTaskDayPlanInput, TaskDayPlan, UpdateTaskDayPlanInput } from '~/domain/entities/taskDayPlan'

export function fetchTaskDayPlans(taskId: string) {
  return apiRequest<TaskDayPlan[]>(`/api/tasks/${taskId}/day-plans`)
}

export function saveTaskDayPlan(taskId: string, input: SaveTaskDayPlanInput) {
  return apiRequest<TaskDayPlan>(`/api/tasks/${taskId}/day-plans`, { method: 'POST', body: input })
}

export function updateTaskDayPlan(id: string, input: UpdateTaskDayPlanInput) {
  return apiRequest<TaskDayPlan>(`/api/task-day-plans/${id}`, { method: 'PATCH', body: input })
}

export function deleteTaskDayPlan(id: string) {
  return apiRequest<{ ok: true }>(`/api/task-day-plans/${id}`, { method: 'DELETE' })
}
