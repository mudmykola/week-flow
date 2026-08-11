import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const board = readFileSync(resolve(process.cwd(), 'app/presentation/components/week/WeekBoardV3.vue'), 'utf8')
const page = readFileSync(resolve(process.cwd(), 'app/presentation/pages/index.vue'), 'utf8')

describe('Week Board 3.0 contract', () => {
  it.each(['status', 'day', 'assignee', 'project', 'priority'])('supports the %s grouping mode', (mode) => {
    expect(board).toContain(`props.mode === '${mode}'`)
  })

  it('provides contextual drag, smart create, top three and responsive navigation', () => {
    expect(board).toContain('@change="moved(lane)"')
    expect(board).toContain("emit('quick'")
    expect(board).toContain('week-board-v3__mobile-nav')
    expect(page).toContain('weekTop')
    expect(page).toContain('boardInsights')
    expect(page).toContain('blockedByTaskId')
  })
})
