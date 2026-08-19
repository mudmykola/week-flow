import type { Task } from './task'

export type ReviewTask = Task & {
  projectName?: string | null
  projectColor?: string | null
}

export type ReviewProgressKind = 'progress' | 'result' | 'decision' | 'blocker'

export type ReviewProgressEntry = {
  id: string
  ownerId: string
  taskId: string
  subtaskId: string | null
  subtaskTitle?: string | null
  workDate: string
  kind: ReviewProgressKind
  note: string
  minutes: number | null
  nextStep: string | null
  createdAt: number
  updatedAt: number
}

export type ReviewTaskJournal = {
  task: ReviewTask
  entries: ReviewProgressEntry[]
  historyEntries: ReviewProgressEntry[]
  activeDays: number
  completedSubtasks: DailyReviewData['completedSubtasks']
  activity: Array<{ id: string; action: string; metadata: Record<string, unknown>; createdAt: number }>
  focusMinutes: number
}

export type DailyReviewData = {
  date: string
  user: { id: string; name: string; avatarUrl: string | null }
  completed: ReviewTask[]
  workedOn: ReviewTask[]
  carriedOver: ReviewTask[]
  planned: ReviewTask[]
  blockers: ReviewTask[]
  availableTasks: ReviewTask[]
  completedSubtasks: Array<{ id: string; taskId: string; title: string; doneAt: number }>
  taskSubtasks: Array<{
    id: string
    taskId: string
    title: string
    status: 'todo' | 'in_progress' | 'done'
    plannedDate: string | null
    rescheduleCount: number
  }>
  progressEntries: ReviewProgressEntry[]
  progressHistory?: ReviewProgressEntry[]
  journals: ReviewTaskJournal[]
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
