import type { Task } from './task'

export type ReviewTask = Task & {
  projectName?: string | null
  projectColor?: string | null
}

export type DailyReviewData = {
  date: string
  user: { id: string; name: string; avatarUrl: string | null }
  completed: ReviewTask[]
  workedOn: ReviewTask[]
  carriedOver: ReviewTask[]
  planned: ReviewTask[]
  blockers: ReviewTask[]
  completedSubtasks: Array<{ id: string; taskId: string; title: string; doneAt: number }>
  focusMinutes: number
  metrics: {
    planned: number
    completed: number
    completionPercent: number
    carriedOver: number
    blockers: number
    estimatedMinutes: number
  }
}

export type SavedDailyReview = {
  id: string
  userId: string
  reviewDate: string
  content: string
  structuredContent: Record<string, unknown>
  excludedTaskIds: string[]
  status: 'draft' | 'submitted'
  createdAt: number
  updatedAt: number
  submittedAt: number | null
}
