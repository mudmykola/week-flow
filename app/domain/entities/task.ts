export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskRecurrence = 'daily' | 'weekly' | 'monthly'
export type TaskWorkState = 'active' | 'waiting' | 'review' | 'deferred' | 'cancelled'

export interface Task {
  id: string
  title: string
  note: string | null
  status: TaskStatus
  projectId: string | null
  week: string
  sort: number
  createdAt: number
  doneAt: number | null
  priority: TaskPriority
  dueDate: string | null
  plannedDate: string | null
  plannedTime: string | null
  estimateMinutes: number | null
  dayRank: number | null
  weekRank: number | null
  blockedByTaskId: string | null
  tags: string[]
  recurrence: TaskRecurrence | null
  archivedAt: number | null
  assigneeId: string | null
  stageId: string | null
  ownerId: string | null
  workState: TaskWorkState
  waitingFor: string | null
  waitingUntil: string | null
  reviewerId: string | null
  reviewNote: string | null
  reviewRequestedAt: number | null
  approvedAt: number | null
  actualMinutes: number | null
  carryoverReason: string | null
  rescheduleCount: number
  originalPlannedDate: string | null
  readyCriteria: string[]
  doneCriteria: string[]
  reminderAt: number | null
  subtaskCount?: number
  completedSubtaskCount?: number
  commentCount?: number
}

export interface TaskPage {
  items: Task[]
  nextCursor: string | null
}

export interface CreateTaskInput {
  title: string
  note?: string | null
  status?: TaskStatus
  projectId?: string | null
  week: string
  sort?: number
  priority?: TaskPriority
  dueDate?: string | null
  plannedDate?: string | null
  plannedTime?: string | null
  estimateMinutes?: number | null
  dayRank?: number | null
  weekRank?: number | null
  blockedByTaskId?: string | null
  tags?: string[]
  recurrence?: TaskRecurrence | null
  assigneeId?: string | null
  stageId?: string | null
  workState?: TaskWorkState
  waitingFor?: string | null
  waitingUntil?: string | null
  reviewerId?: string | null
  reviewNote?: string | null
  actualMinutes?: number | null
  carryoverReason?: string | null
  readyCriteria?: string[]
  doneCriteria?: string[]
  reminderAt?: number | null
}

export interface UpdateTaskInput {
  title?: string
  note?: string | null
  status?: TaskStatus
  projectId?: string | null
  week?: string
  sort?: number
  priority?: TaskPriority
  dueDate?: string | null
  plannedDate?: string | null
  plannedTime?: string | null
  estimateMinutes?: number | null
  dayRank?: number | null
  weekRank?: number | null
  blockedByTaskId?: string | null
  tags?: string[]
  recurrence?: TaskRecurrence | null
  archivedAt?: number | null
  assigneeId?: string | null
  stageId?: string | null
  workState?: TaskWorkState
  waitingFor?: string | null
  waitingUntil?: string | null
  reviewerId?: string | null
  reviewNote?: string | null
  actualMinutes?: number | null
  carryoverReason?: string | null
  readyCriteria?: string[]
  doneCriteria?: string[]
  reminderAt?: number | null
}

export interface AssignableUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  note: string | null
  done: boolean
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  assigneeId: string | null
  sort: number
  createdAt: number
}
