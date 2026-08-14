import type { CreateGoalInput, Goal, UpdateGoalInput } from '~/domain/entities/goal'
import { apiRequest } from '~/data/http/apiClient'

export function fetchMyGoals() {
  return apiRequest<Goal[]>('/api/goals')
}

export function updateGoal(id: string, patch: UpdateGoalInput) {
  return apiRequest<Goal>(`/api/goals/${id}`, { method: 'PATCH', body: patch })
}

export function createTeamGoal(input: CreateGoalInput) {
  return apiRequest<Goal>('/api/team/goals', { method: 'POST', body: input })
}

export function deleteGoal(id: string) {
  return apiRequest<{ ok: true }>(`/api/goals/${id}`, { method: 'DELETE' })
}

export function duplicateGoal(id: string) {
  return apiRequest<Goal>(`/api/goals/${id}/duplicate`, { method: 'POST' })
}

export function bulkUpdateGoals(ids: string[], patch: UpdateGoalInput) {
  return apiRequest<Goal[]>('/api/goals/bulk', { method: 'PATCH', body: { ids, patch } })
}
