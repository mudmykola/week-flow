import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    note: null,
    status: 'todo',
    projectId: null,
    week: '2026-W31',
    sort: 0,
    createdAt: 1,
    doneAt: null,
    priority: 'medium',
    dueDate: null,
    tags: [],
    recurrence: null,
    archivedAt: null,
    assigneeId: null,
    stageId: null,
    ...overrides
  }
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: 'project-1', name: 'Project', color: '#fe5011', createdAt: 1, ...overrides }
}
