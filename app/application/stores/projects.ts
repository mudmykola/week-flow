import { createProject, deleteProject, fetchProjects } from '~/data/repositories/projectsRepository'
import type { CreateProjectInput, Project } from '~/domain/entities/project'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)

  async function loadProjects() {
    loading.value = true
    try {
      projects.value = await fetchProjects()
    } finally {
      loading.value = false
    }
  }

  async function addProject(input: CreateProjectInput) {
    const project = await createProject(input)
    projects.value = [...projects.value, project]
    return project
  }

  async function removeProject(id: string) {
    const previous = projects.value
    projects.value = projects.value.filter((p) => p.id !== id)
    try {
      await deleteProject(id)
    } catch (error) {
      projects.value = previous
      throw error
    }
  }

  function getProject(id: string | null) {
    if (!id) return null
    return projects.value.find((p) => p.id === id) ?? null
  }

  return { projects, loading, loadProjects, addProject, removeProject, getProject }
})
