export type TaskDayPlanStatus = 'planned' | 'completed' | 'moved' | 'skipped'

export interface TaskDayPlan {
  id: string
  ownerId: string
  taskId: string
  plannedDate: string
  plannedTime: string | null
  plannedMinutes: number | null
  status: TaskDayPlanStatus
  carryoverReason: string | null
  createdAt: number
  updatedAt: number
}

export interface SaveTaskDayPlanInput {
  plannedDate: string
  plannedTime?: string | null
  plannedMinutes?: number | null
  status?: TaskDayPlanStatus
  carryoverReason?: string | null
}

export type UpdateTaskDayPlanInput = Omit<Partial<SaveTaskDayPlanInput>, 'plannedDate'>
