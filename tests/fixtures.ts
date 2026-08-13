import type { Goal } from '~/domain/entities/goal'
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
    plannedDate: null,
    plannedTime: null,
    estimateMinutes: null,
    dayRank: null,
    weekRank: null,
    blockedByTaskId: null,
    tags: [],
    recurrence: null,
    archivedAt: null,
    assigneeId: null,
    stageId: null,
    ownerId: 'user-1',
    workState: 'active',
    waitingFor: null,
    waitingUntil: null,
    reviewerId: null,
    reviewNote: null,
    reviewRequestedAt: null,
    approvedAt: null,
    actualMinutes: null,
    carryoverReason: null,
    rescheduleCount: 0,
    originalPlannedDate: null,
    readyCriteria: [],
    doneCriteria: [],
    reminderAt: null,
    ...overrides
  }
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: 'project-1', name: 'Project', color: '#fe5011', createdAt: 1, ...overrides }
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    teamId: 'team-1',
    assigneeId: 'user-1',
    title: 'Ship v2',
    description: null,
    progress: 20,
    status: 'active',
    dueDate: null,
    projectId: null,
    createdBy: 'manager-1',
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}
