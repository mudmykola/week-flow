import { describe, expect, it } from 'vitest'
import { isGoalDueSoon, isGoalOverdue, sortGoalsForDisplay } from '~/domain/services/goals'
import { makeGoal } from '../fixtures'

const today = new Date('2026-08-12T00:00:00Z').getTime()

describe('goal domain service', () => {
  it('flags overdue goals but never done ones or goals without a due date', () => {
    expect(isGoalOverdue(makeGoal({ dueDate: '2026-08-01' }), today)).toBe(true)
    expect(isGoalOverdue(makeGoal({ dueDate: '2026-08-20' }), today)).toBe(false)
    expect(isGoalOverdue(makeGoal({ dueDate: null }), today)).toBe(false)
    expect(isGoalOverdue(makeGoal({ status: 'done', dueDate: '2026-08-01' }), today)).toBe(false)
  })

  it('flags goals due within the next three days but not overdue or far-off ones', () => {
    expect(isGoalDueSoon(makeGoal({ dueDate: '2026-08-13' }), today)).toBe(true)
    expect(isGoalDueSoon(makeGoal({ dueDate: '2026-08-01' }), today)).toBe(false)
    expect(isGoalDueSoon(makeGoal({ dueDate: '2026-09-01' }), today)).toBe(false)
    expect(isGoalDueSoon(makeGoal({ dueDate: null }), today)).toBe(false)
    expect(isGoalDueSoon(makeGoal({ status: 'done', dueDate: '2026-08-13' }), today)).toBe(false)
  })

  it('sorts goals by due date, pushing undated goals to the end', () => {
    const sorted = sortGoalsForDisplay([
      makeGoal({ id: 'no-date-1', dueDate: null }),
      makeGoal({ id: 'later', dueDate: '2026-09-01' }),
      makeGoal({ id: 'sooner', dueDate: '2026-08-13' }),
      makeGoal({ id: 'no-date-2', dueDate: null })
    ])
    expect(sorted.map((goal) => goal.id)).toEqual(['sooner', 'later', 'no-date-1', 'no-date-2'])
  })
})
