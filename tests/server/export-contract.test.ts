// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('account export contract', () => {
  const source = readFileSync(new URL('../../server/api/export.get.ts', import.meta.url), 'utf8')

  it.each([
    'projects',
    'tasks',
    'subtasks',
    'comments',
    'dailyReviews',
    'reminderDeliveries',
    'focusSessions',
    'savedViews',
    'inboxItems',
    'stickyNotes',
    'activityLogs'
  ])('includes owned %s data', (entity) => expect(source).toContain(entity))

  it('versions the JSON export for future migrations', () => {
    expect(source).toContain('schemaVersion: 1')
  })
})
