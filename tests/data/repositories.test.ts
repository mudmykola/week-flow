import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, deleteProject, fetchProjects } from '~/data/repositories/projectsRepository'
import { createTask, deleteTask, fetchAllTasks, fetchTasks, moveWeekTasks, updateTask } from '~/data/repositories/tasksRepository'

const fetchMock = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => fetchMock)

describe('API repositories', () => {
  beforeEach(() => fetchMock.mockReset())

  it('maps project operations to their endpoints', async () => {
    await fetchProjects(); expect(fetchMock).toHaveBeenLastCalledWith('/api/projects')
    await createProject({ name: 'Work', color: '#112233' }); expect(fetchMock).toHaveBeenLastCalledWith('/api/projects', { method: 'POST', body: { name: 'Work', color: '#112233' } })
    await deleteProject('p1'); expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/p1', { method: 'DELETE' })
  })

  it('maps task queries and mutations without empty project filters', async () => {
    await fetchTasks('2026-W31'); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { week: '2026-W31', project: undefined } })
    await fetchTasks('2026-W31', 'p1'); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { week: '2026-W31', project: 'p1' } })
    await fetchAllTasks(); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks')
    await createTask({ title: 'Task', week: '2026-W31' }); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { method: 'POST', body: { title: 'Task', week: '2026-W31' } })
    await updateTask('t1', { status: 'done' }); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/t1', { method: 'PATCH', body: { status: 'done' } })
    await deleteTask('t1'); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/t1', { method: 'DELETE' })
    await moveWeekTasks('2026-W31', '2026-W32'); expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/move-week', { method: 'POST', body: { fromWeek: '2026-W31', toWeek: '2026-W32' } })
  })
})
