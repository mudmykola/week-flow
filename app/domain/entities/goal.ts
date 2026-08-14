export type GoalStatus = 'active' | 'done'
export type GoalPriority = 'low' | 'medium' | 'high'

export interface Goal {
  id: string
  teamId: string
  assigneeId: string | null
  title: string
  description: string | null
  priority: GoalPriority
  labels: string[]
  progress: number
  status: GoalStatus
  dueDate: string | null
  projectId: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
  projectName?: string | null
  projectColor?: string | null
}

export interface CreateGoalInput {
  title: string
  description?: string | null
  priority?: GoalPriority
  labels?: string[]
  assigneeId?: string | null
  dueDate?: string | null
  teamId?: string
}

export interface UpdateGoalInput {
  title?: string
  description?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  priority?: GoalPriority
  labels?: string[]
  progress?: number
  status?: GoalStatus
  projectId?: string | null
}
