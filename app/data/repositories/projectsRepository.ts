import type { CreateProjectInput, Project } from '~/domain/entities/project'
import { apiRequest } from '~/data/http/apiClient'

export function fetchProjects() {
  return apiRequest<Project[]>('/api/projects')
}

export function createProject(input: CreateProjectInput) {
  return apiRequest<Project>('/api/projects', { method: 'POST', body: input })
}

export function deleteProject(id: string) {
  return apiRequest<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' })
}
