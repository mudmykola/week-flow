import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
import { buildGraph } from '~/domain/services/graph'

export function useGraphData() {
  const projectsStore = useProjectsStore()
  const allTasks = ref<Task[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      await Promise.all([
        projectsStore.projects.length ? Promise.resolve() : projectsStore.loadProjects(),
        fetchAllTasks().then((result) => { allTasks.value = result })
      ])
    } finally {
      loading.value = false
    }
  }

  const graph = computed(() => buildGraph(projectsStore.projects, allTasks.value))

  return { graph, loading, load }
}
