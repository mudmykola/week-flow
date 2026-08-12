import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workspace = readFileSync(resolve(process.cwd(), 'app/presentation/components/review/ReviewWorkspace.vue'), 'utf8')
const page = readFileSync(resolve(process.cwd(), 'app/presentation/pages/review/index.vue'), 'utf8')

describe('Review 2.0 workspace contract', () => {
  it('keeps daily, weekly, history and team modes in a dedicated workspace', () => {
    expect(page).toContain('<ReviewWorkspace')
    for (const tab of ['daily', 'weekly', 'history', 'team']) expect(workspace).toContain(`'${tab}'`)
  })

  it('uses actual review data, persisted autosave, standup copy and keyboard date navigation', () => {
    expect(workspace).toContain('fetchDailyReview')
    expect(workspace).toContain('saveDailyReview')
    expect(workspace).toContain('generateDailyReflection')
    expect(workspace).toContain('generateStandup')
    expect(workspace).toContain("onKeyStroke('ArrowLeft'")
    expect(workspace).toContain('navigator.clipboard.writeText')
  })
})
