import { describe, expect, it } from 'vitest'
import { buildDailyReview, generateDailyReflection, generateStandup } from '../../app/domain/services/dailyReview'
import { makeTask } from '../fixtures'

const dayStart = new Date('2026-08-11T00:00:00').getTime()
const dayEnd = new Date('2026-08-11T23:59:59').getTime()

describe('daily review service', () => {
  it('derives completed, worked, planned, carried and blocked work from real task state', () => {
    const review = buildDailyReview({
      date: '2026-08-11',
      user: { id: 'user', name: 'Mykola', avatarUrl: null },
      dayStart,
      dayEnd,
      workedTaskIds: ['worked'],
      focusMinutes: 45,
      tasks: [
        makeTask({ id: 'done', title: 'Shipped', status: 'done', doneAt: dayStart + 1000, plannedDate: '2026-08-11' }),
        makeTask({ id: 'worked', title: 'Drafted', status: 'in_progress' }),
        makeTask({ id: 'planned', title: 'Plan', plannedDate: '2026-08-11', priority: 'urgent' }),
        makeTask({ id: 'old', title: 'Carry', plannedDate: '2026-08-10' }),
        makeTask({ id: 'blocked', title: 'Wait', blockedByTaskId: 'done' })
      ]
    })
    expect(review.completed.map((task) => task.id)).toEqual(['done'])
    expect(review.workedOn.map((task) => task.id)).toEqual(['worked'])
    expect(review.planned.map((task) => task.id)).toEqual(['planned'])
    expect(review.carriedOver.map((task) => task.id)).toEqual(['old'])
    expect(review.blockers.map((task) => task.id)).toEqual(['blocked'])
    expect(review.focusMinutes).toBe(45)
  })

  it('generates deterministic editable reflection and standup text', () => {
    const data = buildDailyReview({
      date: '2026-08-11',
      user: { id: 'user', name: 'Mykola', avatarUrl: null },
      dayStart,
      dayEnd,
      tasks: [
        makeTask({ title: 'Finished API', status: 'done', doneAt: dayStart + 1000 }),
        makeTask({ title: 'Build UI', plannedDate: '2026-08-11' })
      ]
    })
    const reflection = generateDailyReflection(data, {
      results: 'Results',
      workedOn: 'Worked',
      unfinished: 'Unfinished',
      nextFocus: 'Next',
      blockers: 'Blockers',
      summary: 'Summary',
      subtask: 'subtask',
      emptyResults: 'none',
      emptyWorkedOn: 'none',
      emptyUnfinished: 'none',
      emptyNextFocus: 'none',
      emptyBlockers: 'none',
      summaryText: '{completed}/{percent}/{focus}'
    })
    const standup = generateStandup(data, {
      yesterday: 'Yesterday',
      today: 'Today',
      blockers: 'Blockers',
      emptyYesterday: 'none',
      emptyToday: 'none',
      emptyBlockers: 'none'
    })
    expect(reflection).toContain('Finished API')
    expect(reflection).toContain('Build UI')
    expect(standup).toContain('Yesterday:')
    expect(standup).toContain('Today:')
  })

  it('derives local boundaries, sorts Top 3 before priority and includes due work with default estimates', () => {
    const inside = new Date('2026-08-11T12:00:00').getTime()
    const review = buildDailyReview({
      date: '2026-08-11',
      user: { id: 'user', name: 'Mykola', avatarUrl: null },
      completedSubtasks: [{ id: 'sub', taskId: 'done', title: 'Tested', doneAt: inside }],
      tasks: [
        makeTask({ id: 'outside', status: 'done', doneAt: new Date('2026-08-10T12:00:00').getTime() }),
        makeTask({ id: 'done', status: 'done', doneAt: inside }),
        makeTask({ id: 'urgent', title: 'Urgent', dueDate: '2026-08-11', priority: 'urgent' }),
        makeTask({
          id: 'top',
          title: 'Top',
          plannedDate: '2026-08-11',
          priority: 'low',
          dayRank: 1,
          estimateMinutes: 60
        }),
        makeTask({ id: 'overdue', dueDate: '2026-08-10' })
      ]
    })
    expect(review.completed.map((task) => task.id)).toEqual(['done'])
    expect(review.planned.map((task) => task.id)).toEqual(['top', 'urgent'])
    expect(review.blockers.map((task) => task.id)).toEqual(['overdue'])
    expect(review.metrics.estimatedMinutes).toBe(90)
    expect(review.completedSubtasks).toHaveLength(1)
  })
})
