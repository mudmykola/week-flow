import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProject, makeTask } from '../fixtures'

const projectApi = vi.hoisted(() => ({ fetchProjects: vi.fn(), createProject: vi.fn(), deleteProject: vi.fn() }))
const taskApi = vi.hoisted(() => ({
  fetchTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  moveWeekTasks: vi.fn()
}))

vi.mock('~/data/repositories/projectsRepository', () => projectApi)
vi.mock('~/data/repositories/tasksRepository', () => taskApi)

import { useProjectsStore } from '~/application/stores/projects'
import { useTasksStore } from '~/application/stores/tasks'

describe('Pinia stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads, indexes, adds and removes projects', async () => {
    const project = makeProject()
    projectApi.fetchProjects.mockResolvedValue([project])
    projectApi.createProject.mockResolvedValue(makeProject({ id: 'project-2', name: 'New' }))
    projectApi.deleteProject.mockResolvedValue({ ok: true })
    const store = useProjectsStore()
    await store.loadProjects()
    expect(store.loading).toBe(false)
    expect(store.getProject(project.id)).toEqual(project)
    expect(store.getProject(null)).toBeNull()
    await store.addProject({ name: 'New', color: '#112233' })
    expect(store.projects).toHaveLength(2)
    await store.removeProject(project.id)
    expect(store.projects.map((item) => item.id)).toEqual(['project-2'])
  })

  it('always resets project loading after API failure', async () => {
    projectApi.fetchProjects.mockRejectedValue(new Error('network'))
    const store = useProjectsStore()
    await expect(store.loadProjects()).rejects.toThrow('network')
    expect(store.loading).toBe(false)
  })

  it('loads, filters and sorts tasks by status', async () => {
    const tasks = [
      makeTask({ id: 'b', sort: 2, projectId: 'p1' }),
      makeTask({ id: 'a', sort: 1, projectId: 'p1' }),
      makeTask({ id: 'done', status: 'done', projectId: 'p2' })
    ]
    taskApi.fetchTasks.mockResolvedValue(tasks)
    const store = useTasksStore()
    await store.loadTasks('2026-W31')
    expect(store.loading).toBe(false)
    expect(store.tasksByStatus.todo.map((task) => task.id)).toEqual(['a', 'b'])
    store.filterProjectId = 'p2'
    expect(store.filteredTasks.map((task) => task.id)).toEqual(['done'])
  })

  it('adds, patches, cycles and removes tasks', async () => {
    const store = useTasksStore()
    const task = makeTask()
    taskApi.createTask.mockResolvedValue(task)
    await store.addTask({ title: task.title, week: task.week })
    const progressed = makeTask({ status: 'in_progress' })
    taskApi.updateTask.mockResolvedValue(progressed)
    await store.cycleStatus(task)
    expect(taskApi.updateTask).toHaveBeenCalledWith(task.id, { status: 'in_progress' })
    expect(store.tasks[0]?.status).toBe('in_progress')
    taskApi.deleteTask.mockResolvedValue({ ok: true })
    await store.removeTask(task.id)
    expect(store.tasks).toEqual([])
  })

  it('moves only incomplete tasks out of the current week', async () => {
    const store = useTasksStore()
    store.tasks = [makeTask(), makeTask({ id: 'done', status: 'done' })]
    taskApi.moveWeekTasks.mockResolvedValue({ moved: 1 })
    await expect(store.moveIncompleteToNextWeek('2026-W31')).resolves.toEqual({ moved: 1 })
    expect(taskApi.moveWeekTasks).toHaveBeenCalledWith('2026-W31', '2026-W32')
    expect(store.tasks.map((task) => task.id)).toEqual(['done'])
  })

  it('only persists changed task order entries', async () => {
    const store = useTasksStore()
    const unchanged = makeTask({ id: 'a', sort: 0 })
    const changed = makeTask({ id: 'b', sort: 5 })
    store.tasks = [unchanged, changed]
    taskApi.updateTask.mockImplementation(async (id: string, patch: object) => ({
      ...(id === 'a' ? unchanged : changed),
      ...patch
    }))
    await store.reorderColumn('todo', [unchanged, changed])
    expect(taskApi.updateTask).toHaveBeenCalledTimes(1)
    expect(taskApi.updateTask).toHaveBeenCalledWith('b', { status: 'todo', sort: 1 })
  })
})
