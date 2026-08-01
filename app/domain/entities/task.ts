export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskRecurrence = 'daily' | 'weekly' | 'monthly'

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
  tags: string[]
  recurrence: TaskRecurrence | null
  archivedAt: number | null
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
  tags?: string[]
  recurrence?: TaskRecurrence | null
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
  tags?: string[]
  recurrence?: TaskRecurrence | null
  archivedAt?: number | null
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
  sort: number
  createdAt: number
}
