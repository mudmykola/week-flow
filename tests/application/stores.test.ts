import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProject, makeTask } from '../fixtures'

const projectApi = vi.hoisted(() => ({ fetchProjects: vi.fn(), createProject: vi.fn(), deleteProject: vi.fn() }))
const taskApi = vi.hoisted(() => ({
  fetchTasks: vi.fn(),
  fetchInboxTasks: vi.fn(),
  fetchDueTasks: vi.fn(),
  fetchArchivedTasks: vi.fn(),
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

  it('restores a project when optimistic deletion fails', async () => {
    const project = makeProject()
    const store = useProjectsStore()
    store.projects = [project]
    projectApi.deleteProject.mockRejectedValue(new Error('network'))
    const deletion = store.removeProject(project.id)
    expect(store.projects).toEqual([])
    await expect(deletion).rejects.toThrow('network')
    expect(store.projects).toEqual([project])
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

  it('restores optimistic task edits and deletion after API failure', async () => {
    const task = makeTask()
    const store = useTasksStore()
    store.tasks = [task]
    taskApi.updateTask.mockRejectedValue(new Error('network'))
    const patch = store.patchTask(task.id, { status: 'done' })
    expect(store.tasks[0]?.status).toBe('done')
    await expect(patch).rejects.toThrow('network')
    expect(store.tasks[0]).toEqual(task)

    taskApi.deleteTask.mockRejectedValue(new Error('network'))
    const deletion = store.removeTask(task.id)
    expect(store.tasks).toEqual([])
    await expect(deletion).rejects.toThrow('network')
    expect(store.tasks).toEqual([task])
  })

  it('persists an edit safely when the task is not loaded locally', async () => {
    const persisted = makeTask({ id: 'remote', status: 'done' })
    const store = useTasksStore()
    taskApi.updateTask.mockResolvedValue(persisted)
    await expect(store.patchTask('remote', { status: 'done' })).resolves.toEqual(persisted)
    expect(store.tasks).toEqual([])

    taskApi.updateTask.mockRejectedValue(new Error('network'))
    await expect(store.patchTask('missing', { status: 'done' })).rejects.toThrow('network')
    expect(store.tasks).toEqual([])
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

  it('loads inbox tasks and drops one once it no longer qualifies', async () => {
    const task = makeTask()
    taskApi.fetchInboxTasks.mockResolvedValue([task])
    const store = useTasksStore()
    await store.loadInboxTasks()
    expect(store.inboxLoading).toBe(false)
    expect(store.inboxTasks).toEqual([task])

    taskApi.updateTask.mockResolvedValue({ ...task, projectId: 'project-1' })
    await store.patchInboxTask(task.id, { projectId: 'project-1' })
    expect(store.inboxTasks).toEqual([])
  })

  it('keeps a still-qualifying inbox task updated in place', async () => {
    const task = makeTask()
    const store = useTasksStore()
    store.inboxTasks = [task]
    taskApi.updateTask.mockResolvedValue({ ...task, priority: 'urgent' })
    await store.patchInboxTask(task.id, { priority: 'urgent' })
    expect(store.inboxTasks[0]?.priority).toBe('urgent')
  })

  it('restores optimistic inbox edits and deletion after API failure', async () => {
    const task = makeTask()
    const store = useTasksStore()
    store.inboxTasks = [task]
    taskApi.updateTask.mockRejectedValue(new Error('network'))
    const patch = store.patchInboxTask(task.id, { priority: 'urgent' })
    expect(store.inboxTasks[0]?.priority).toBe('urgent')
    await expect(patch).rejects.toThrow('network')
    expect(store.inboxTasks[0]).toEqual(task)

    taskApi.deleteTask.mockRejectedValue(new Error('network'))
    const deletion = store.removeInboxTask(task.id)
    expect(store.inboxTasks).toEqual([])
    await expect(deletion).rejects.toThrow('network')
    expect(store.inboxTasks).toEqual([task])
  })

  it('syncs an editor update by upserting or removing an inbox task', () => {
    const task = makeTask()
    const store = useTasksStore()
    store.inboxTasks = [task]

    store.syncInboxTaskFromEditor({ ...task, priority: 'high' })
    expect(store.inboxTasks[0]?.priority).toBe('high')

    store.syncInboxTaskFromEditor({ ...task, projectId: 'project-1' })
    expect(store.inboxTasks).toEqual([])

    const newTask = makeTask({ id: 'promoted' })
    store.syncInboxTaskFromEditor(newTask)
    expect(store.inboxTasks).toEqual([newTask])
  })

  it('restores a completed inbox task and recreates a deleted one', async () => {
    const task = makeTask()
    const store = useTasksStore()
    taskApi.updateTask.mockResolvedValue(task)
    await store.restoreCompletedInboxTask(task)
    expect(store.inboxTasks).toEqual([task])

    store.inboxTasks = []
    const recreated = makeTask({ id: 'task-2' })
    taskApi.createTask.mockResolvedValue(recreated)
    await store.recreateInboxTask(task)
    expect(taskApi.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: task.title, week: task.week }))
    expect(store.inboxTasks).toEqual([recreated])
  })

  it('loads, adds and optimistically patches list tasks with rollback on failure', async () => {
    const task = makeTask({ dueDate: '2026-08-05' })
    taskApi.fetchDueTasks.mockResolvedValue([task])
    const store = useTasksStore()
    await store.loadListTasks(taskApi.fetchDueTasks)
    expect(store.listLoading).toBe(false)
    expect(store.listTasks).toEqual([task])

    const created = makeTask({ id: 'task-2' })
    taskApi.createTask.mockResolvedValue(created)
    await store.addListTask({ title: created.title, week: created.week })
    expect(store.listTasks[0]).toEqual(created)

    taskApi.updateTask.mockRejectedValue(new Error('network'))
    const patch = store.patchListTask(task.id, { status: 'done' })
    expect(store.listTasks.find((item) => item.id === task.id)?.status).toBe('done')
    await expect(patch).rejects.toThrow('network')
    expect(store.listTasks.find((item) => item.id === task.id)).toEqual(task)
  })

  it('removes a list task and restores it via recreateListTask on undo', async () => {
    const task = makeTask()
    const store = useTasksStore()
    store.listTasks = [task]
    taskApi.deleteTask.mockResolvedValue({ ok: true })
    await store.removeListTask(task.id)
    expect(store.listTasks).toEqual([])

    const recreated = makeTask({ id: 'task-2' })
    taskApi.createTask.mockResolvedValue(recreated)
    await store.recreateListTask(task)
    expect(store.listTasks).toEqual([recreated])
  })

  it('upserts a task into the list via syncListTask', () => {
    const task = makeTask()
    const store = useTasksStore()
    store.syncListTask(task)
    expect(store.listTasks).toEqual([task])
    const updated = { ...task, title: 'Updated' }
    store.syncListTask(updated)
    expect(store.listTasks).toEqual([updated])
  })
})
