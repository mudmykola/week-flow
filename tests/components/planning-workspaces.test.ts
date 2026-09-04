// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Backlog and Capacity workspace contracts', () => {
  it('keeps raw Inbox capture contextual and exposes both planning destinations', () => {
    const navigation = read('app/domain/services/navigation.ts')
    const gitignore = read('.gitignore')
    expect(navigation).toContain("to: '/backlog'")
    expect(navigation).toContain("to: '/capacity'")
    expect(navigation).toContain("to: '/inbox',\n    section: 'work',\n    visibility: 'contextual'")
    expect(gitignore).toContain('/backlog/')
    expect(gitignore).not.toMatch(/^backlog\/$/m)
  })

  it('supports filtering, bulk scheduling and direct task editing in Backlog', () => {
    const backlog = read('app/presentation/pages/backlog/index.vue')
    expect(backlog).toContain('backlogTasks(tasks.value)')
    expect(backlog).toContain('fetchBacklogTasks()')
    expect(backlog).toContain('bulkUpdateTasks')
    expect(backlog).toContain('dateToWeek(parseISO')
    expect(backlog).toContain('<TaskEditor')
  })

  it('shows weekday utilization and can fill available capacity', () => {
    const capacity = read('app/presentation/pages/capacity/index.vue')
    expect(capacity).toContain('buildCapacityDays')
    expect(capacity).toContain('buildCapacityPlan')
    expect(capacity).toContain('fetchTasks(week.value)')
    expect(capacity).toContain('weekflow-capacity-workday-minutes')
    expect(capacity).toContain('autoBalance')
  })
})
