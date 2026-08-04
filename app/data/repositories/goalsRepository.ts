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
