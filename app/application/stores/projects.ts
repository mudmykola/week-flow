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
    projects.value.push(project)
    return project
  }

  async function removeProject(id: string) {
    await deleteProject(id)
    projects.value = projects.value.filter(p => p.id !== id)
  }

  function getProject(id: string | null) {
    if (!id) return null
    return projects.value.find(p => p.id === id) ?? null
  }

  return { projects, loading, loadProjects, addProject, removeProject, getProject }
})
