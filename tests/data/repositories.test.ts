import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, deleteProject, fetchProjects } from '~/data/repositories/projectsRepository'
import {
  bulkUpdateTasks,
  createTask,
  deleteTask,
  duplicateTask,
  fetchAllTasks,
  fetchTaskPage,
  fetchArchivedTasks,
  fetchDueTasks,
  fetchInboxTasks,
  fetchTasks,
  fetchTodayPlan,
  fetchTodayTasks,
  moveWeekTasks,
  updateTask
} from '~/data/repositories/tasksRepository'
import {
  createStickyNote,
  deleteStickyNote,
  fetchStickyNotes,
  updateStickyNote
} from '~/data/repositories/stickyNotesRepository'
import { fetchDailyReview, fetchReviewHistory, saveDailyReview } from '~/data/repositories/reviewsRepository'
import { createTeamGoal, fetchMyGoals, updateGoal } from '~/data/repositories/goalsRepository'
import {
  captureInboxItems,
  deleteInboxItem,
  fetchInboxItems,
  resolveInboxItem,
  updateInboxItem
} from '~/data/repositories/inboxRepository'

const fetchMock = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => fetchMock)

describe('API repositories', () => {
  beforeEach(() => fetchMock.mockReset())

  it('maps project operations to their endpoints', async () => {
    await fetchProjects()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects')
    await createProject({ name: 'Work', color: '#112233' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects', {
      method: 'POST',
      body: { name: 'Work', color: '#112233' }
    })
    await deleteProject('p1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/p1', { method: 'DELETE' })
  })

  it('maps task queries and mutations without empty project filters', async () => {
    await fetchTasks('2026-W31')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { week: '2026-W31', project: undefined } })
    await fetchTasks('2026-W31', 'p1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { week: '2026-W31', project: 'p1' } })
    fetchMock.mockResolvedValueOnce({ items: [], nextCursor: null })
    await fetchAllTasks()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', {
      query: { paginated: '1', cursor: undefined, limit: 100 }
    })
    await fetchTaskPage('123_task', 25)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', {
      query: { paginated: '1', cursor: '123_task', limit: 25 }
    })
    await createTask({ title: 'Task', week: '2026-W31' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', week: '2026-W31' }
    })
    await updateTask('t1', { status: 'done' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/t1', { method: 'PATCH', body: { status: 'done' } })
    await deleteTask('t1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/t1', { method: 'DELETE' })
    await moveWeekTasks('2026-W31', '2026-W32')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/move-week', {
      method: 'POST',
      body: { fromWeek: '2026-W31', toWeek: '2026-W32' }
    })
  })

  it('loads every cursor page instead of using an unbounded task request', async () => {
    fetchMock
      .mockResolvedValueOnce({ items: [{ id: 't1' }], nextCursor: '100_t1' })
      .mockResolvedValueOnce({ items: [{ id: 't2' }], nextCursor: null })
    await expect(fetchAllTasks()).resolves.toEqual([{ id: 't1' }, { id: 't2' }])
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/tasks', {
      query: { paginated: '1', cursor: undefined, limit: 100 }
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/tasks', {
      query: { paginated: '1', cursor: '100_t1', limit: 100 }
    })
  })

  it('maps scoped task queries and bulk/duplicate mutations to their endpoints', async () => {
    await fetchInboxTasks()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { scope: 'inbox' } })
    await fetchDueTasks()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { scope: 'due' } })
    await fetchTodayTasks('2026-08-12')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { scope: 'today', date: '2026-08-12' } })
    await fetchTodayPlan('2026-08-12', 480, 1080)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/today', { query: { date: '2026-08-12', start: 480, end: 1080 } })
    await fetchArchivedTasks()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks', { query: { scope: 'archived' } })
    await bulkUpdateTasks(['t1', 't2'], { status: 'done' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/bulk', {
      method: 'PATCH',
      body: { ids: ['t1', 't2'], patch: { status: 'done' } }
    })
    await duplicateTask('t1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks/t1/duplicate', { method: 'POST' })
  })

  it('maps goal fetch and mutation operations to their endpoints', async () => {
    await fetchMyGoals()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/goals')
    await updateGoal('goal-1', { progress: 50 })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/goals/goal-1', { method: 'PATCH', body: { progress: 50 } })
    await createTeamGoal({ title: 'Ship v2' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/team/goals', { method: 'POST', body: { title: 'Ship v2' } })
  })

  it('maps inbox capture, update and resolve operations to their endpoints', async () => {
    await fetchInboxItems()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/inbox')
    await captureInboxItems('Call the client')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/inbox', {
      method: 'POST',
      body: { content: 'Call the client' }
    })
    await updateInboxItem('item-1', 'Call the client tomorrow')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/inbox/item-1', {
      method: 'PATCH',
      body: { content: 'Call the client tomorrow' }
    })
    await deleteInboxItem('item-1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/inbox/item-1', { method: 'DELETE' })
    await resolveInboxItem('item-1', { destination: 'task', dueDate: '2026-08-20' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/inbox/item-1/resolve', {
      method: 'POST',
      body: { destination: 'task', dueDate: '2026-08-20' }
    })
  })

  it('maps sticky-note CRUD operations to account endpoints', async () => {
    await fetchStickyNotes()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sticky-notes')
    await createStickyNote({ content: 'Daily follow-up', color: 'yellow' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sticky-notes', {
      method: 'POST',
      body: { content: 'Daily follow-up', color: 'yellow' }
    })
    await updateStickyNote('note-1', { done: true, positionX: 120 })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sticky-notes/note-1', {
      method: 'PATCH',
      body: { done: true, positionX: 120 }
    })
    await deleteStickyNote('note-1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sticky-notes/note-1', { method: 'DELETE' })
  })

  it('maps daily review aggregation, history and autosave to review endpoints', async () => {
    await fetchDailyReview('2026-08-12', 100, 200)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reviews/daily', {
      query: { date: '2026-08-12', start: 100, end: 200, user: undefined }
    })
    await fetchDailyReview('2026-08-12', 100, 200, 'user-1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reviews/daily', {
      query: { date: '2026-08-12', start: 100, end: 200, user: 'user-1' }
    })
    await fetchReviewHistory('2026-08-12')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reviews', { query: { date: '2026-08-12' } })
    await saveDailyReview({ reviewDate: '2026-08-12', content: 'Ready', status: 'submitted' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reviews', {
      method: 'PATCH',
      body: { reviewDate: '2026-08-12', content: 'Ready', status: 'submitted' }
    })
  })
})
