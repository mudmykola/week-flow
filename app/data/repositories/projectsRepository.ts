import type { CreateProjectInput, Project } from '~/domain/entities/project'

export function fetchProjects() {
  return $fetch<Project[]>('/api/projects')
}

export function createProject(input: CreateProjectInput) {
  return $fetch<Project>('/api/projects', { method: 'POST', body: input })
}

export function deleteProject(id: string) {
  return $fetch<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' })
}
