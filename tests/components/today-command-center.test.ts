// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Today daily command center', () => {
  const source = readFileSync(
    new URL('../../app/presentation/components/today/TodayCommandCenter.vue', import.meta.url),
    'utf8'
  )

  it('unifies inbox capture, sticky checklists and reminder navigation', () => {
    expect(source).toContain('captureInboxItems')
    expect(source).toContain('updateStickyNote')
    expect(source).toContain("$fetch<ReminderItem[]>('/api/reminders')")
    expect(source).toContain('query: { task: item.taskId }')
  })

  it('bounds each supporting list for a compact daily view', () => {
    expect(source).toContain('.slice(0, 5)')
    expect(source).toContain('inbox.slice(0, 3)')
  })
})
