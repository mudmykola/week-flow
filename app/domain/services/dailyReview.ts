import type { DailyReviewData, ReviewTask } from '~/domain/entities/review'
import type { Task } from '~/domain/entities/task'

export type DailyReviewSource = {
  date: string
  user: DailyReviewData['user']
  tasks: ReviewTask[]
  workedTaskIds?: string[]
  completedSubtasks?: DailyReviewData['completedSubtasks']
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
  return {
    date: source.date,
    user: source.user,
    completed,
    workedOn,
    carriedOver,
    planned,
    blockers,
    completedSubtasks: source.completedSubtasks || [],
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
        ...data.completedSubtasks.map((item) => `${item.title} (${labels.subtask})`)
      ],
      labels.emptyResults
    ),
    section(
      labels.workedOn,
      data.workedOn.map((task) => task.title),
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
      data.completed.map((task) => task.title),
      labels.emptyYesterday
    ),
    section(
      labels.today,
      data.planned.map((task) => task.title),
      labels.emptyToday
    ),
    section(
      labels.blockers,
      data.blockers.map((task) => task.title),
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
