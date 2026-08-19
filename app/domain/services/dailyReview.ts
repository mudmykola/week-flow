import type { DailyReviewData, ReviewTask } from '~/domain/entities/review'
import type { Task } from '~/domain/entities/task'

export type DailyReviewSource = {
  date: string
  user: DailyReviewData['user']
  tasks: ReviewTask[]
  workedTaskIds?: string[]
  completedSubtasks?: DailyReviewData['completedSubtasks']
  taskSubtasks?: DailyReviewData['taskSubtasks']
  progressEntries?: DailyReviewData['progressEntries']
  progressHistory?: DailyReviewData['progressHistory']
  activityEvents?: Array<{
    id: string
    taskId: string
    action: string
    metadata: Record<string, unknown>
    createdAt: number
  }>
  focusByTask?: Array<{ taskId: string; minutes: number }>
  focusMinutes?: number
  dayStart?: number
  dayEnd?: number
}

export function buildDailyReview(source: DailyReviewSource): DailyReviewData {
  const dayStart = source.dayStart ?? localDayStart(source.date)
  const dayEnd = source.dayEnd ?? localDayEnd(source.date)
  const completed = source.tasks
    .filter((task) => task.doneAt && task.doneAt >= dayStart && task.doneAt <= dayEnd)
    .sort((left, right) => (right.doneAt || 0) - (left.doneAt || 0))
  const workedIds = new Set(source.workedTaskIds || [])
  const workedOn = source.tasks.filter(
    (task) => workedIds.has(task.id) && !completed.some((done) => done.id === task.id)
  )
  const planned = source.tasks
    .filter((task) => task.status !== 'done' && (task.plannedDate === source.date || task.dueDate === source.date))
    .sort(reviewTaskOrder)
  const carriedOver = source.tasks.filter(
    (task) => task.status !== 'done' && Boolean(task.plannedDate) && task.plannedDate! < source.date
  )
  const blockers = source.tasks.filter(
    (task) =>
      task.status !== 'done' && (Boolean(task.blockedByTaskId) || Boolean(task.dueDate && task.dueDate < source.date))
  )
  const plannedTotal = planned.length + completed.filter((task) => task.plannedDate === source.date).length
  const progressEntries = source.progressEntries || []
  const progressHistory = source.progressHistory || progressEntries
  const journalTaskIds = new Set([
    ...progressEntries.map((entry) => entry.taskId),
    ...(source.completedSubtasks || []).map((entry) => entry.taskId),
    ...(source.activityEvents || []).map((entry) => entry.taskId),
    ...(source.focusByTask || []).map((entry) => entry.taskId)
  ])
  const journals = source.tasks
    .filter((task) => journalTaskIds.has(task.id))
    .map((task) => ({
      task,
      entries: progressEntries.filter((entry) => entry.taskId === task.id).sort((a, b) => b.createdAt - a.createdAt),
      historyEntries: progressHistory
        .filter((entry) => entry.taskId === task.id)
        .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt - a.createdAt),
      activeDays: new Set(progressHistory.filter((entry) => entry.taskId === task.id).map((entry) => entry.workDate))
        .size,
      completedSubtasks: (source.completedSubtasks || []).filter((entry) => entry.taskId === task.id),
      activity: (source.activityEvents || [])
        .filter((entry) => entry.taskId === task.id)
        .map(({ taskId: _taskId, ...entry }) => entry)
        .sort((a, b) => b.createdAt - a.createdAt),
      focusMinutes: (source.focusByTask || [])
        .filter((entry) => entry.taskId === task.id)
        .reduce((sum, entry) => sum + entry.minutes, 0)
    }))
    .sort((a, b) => {
      const left = Math.max(
        a.entries[0]?.createdAt || 0,
        a.completedSubtasks[0]?.doneAt || 0,
        a.activity[0]?.createdAt || 0
      )
      const right = Math.max(
        b.entries[0]?.createdAt || 0,
        b.completedSubtasks[0]?.doneAt || 0,
        b.activity[0]?.createdAt || 0
      )
      return right - left
    })
  return {
    date: source.date,
    user: source.user,
    completed,
    workedOn,
    carriedOver,
    planned,
    blockers,
    availableTasks: source.tasks,
    completedSubtasks: source.completedSubtasks || [],
    taskSubtasks: source.taskSubtasks || [],
    progressEntries,
    progressHistory,
    journals,
    focusMinutes: source.focusMinutes || 0,
    metrics: {
      planned: plannedTotal,
      completed: completed.length,
      completionPercent: plannedTotal ? Math.round((completed.length / plannedTotal) * 100) : 0,
      carriedOver: carriedOver.length,
      blockers: blockers.length,
      estimatedMinutes: planned.reduce((sum, task) => sum + (task.estimateMinutes || 30), 0)
    }
  }
}

export function generateDailyReflection(data: DailyReviewData, labels: ReflectionLabels) {
  return [
    section(
      labels.results,
      [
        ...data.completed.map((task) => task.title),
        ...data.completedSubtasks.map((item) => `${item.title} (${labels.subtask})`),
        ...data.progressEntries
          .filter((entry) => entry.kind === 'result' || entry.kind === 'progress')
          .map((entry) => entry.note)
      ],
      labels.emptyResults
    ),
    section(
      labels.workedOn,
      [
        ...data.journals.map((journal) =>
          journal.entries.length
            ? `${journal.task.title}: ${journal.entries.map((entry) => entry.note).join('; ')}`
            : journal.task.title
        ),
        ...data.workedOn
          .filter((task) => !data.journals.some((journal) => journal.task.id === task.id))
          .map((task) => task.title)
      ],
      labels.emptyWorkedOn
    ),
    section(
      labels.unfinished,
      data.carriedOver.map((task) => task.title),
      labels.emptyUnfinished
    ),
    section(
      labels.nextFocus,
      data.planned.map((task) => task.title),
      labels.emptyNextFocus
    ),
    section(
      labels.blockers,
      data.blockers.map((task) => task.title),
      labels.emptyBlockers
    ),
    `${labels.summary}: ${labels.summaryText
      .replace('{completed}', String(data.metrics.completed))
      .replace('{percent}', String(data.metrics.completionPercent))
      .replace('{focus}', String(data.focusMinutes))}`
  ].join('\n\n')
}

export function generateStandup(data: DailyReviewData, labels: StandupLabels) {
  return [
    section(
      labels.yesterday,
      [
        ...data.journals.map((journal) =>
          journal.entries.length
            ? `${journal.task.title}: ${journal.entries.map((entry) => entry.note).join('; ')}`
            : journal.task.title
        ),
        ...data.completed
          .filter((task) => !data.journals.some((journal) => journal.task.id === task.id))
          .map((task) => task.title)
      ],
      labels.emptyYesterday
    ),
    section(
      labels.today,
      [
        ...data.progressEntries.map((entry) => entry.nextStep).filter((item): item is string => Boolean(item)),
        ...data.planned.map((task) => task.title)
      ],
      labels.emptyToday
    ),
    section(
      labels.blockers,
      [
        ...data.progressEntries.filter((entry) => entry.kind === 'blocker').map((entry) => entry.note),
        ...data.blockers.map((task) => task.title)
      ],
      labels.emptyBlockers
    )
  ].join('\n\n')
}

function section(title: string, items: string[], empty: string) {
  return `${title}:\n${items.length ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : `— ${empty}`}`
}

function reviewTaskOrder(left: Task, right: Task) {
  const priority = { urgent: 0, high: 1, medium: 2, low: 3 }
  return (left.dayRank || 4) - (right.dayRank || 4) || priority[left.priority] - priority[right.priority]
}

function localDayStart(date: string) {
  return new Date(`${date}T00:00:00`).getTime()
}

function localDayEnd(date: string) {
  return new Date(`${date}T23:59:59.999`).getTime()
}

export type ReflectionLabels = {
  results: string
  workedOn: string
  unfinished: string
  nextFocus: string
  blockers: string
  summary: string
  subtask: string
  emptyResults: string
  emptyWorkedOn: string
  emptyUnfinished: string
  emptyNextFocus: string
  emptyBlockers: string
  summaryText: string
}

export type StandupLabels = {
  yesterday: string
  today: string
  blockers: string
  emptyYesterday: string
  emptyToday: string
  emptyBlockers: string
}
