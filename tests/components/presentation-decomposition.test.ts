// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('presentation orchestration boundaries', () => {
  it.each([
    ['app/presentation/components/shell/AppShell.vue', 'ShellSidebar'],
    ['app/presentation/components/task/TaskEditor.vue', 'TaskTagsEditor'],
    ['app/presentation/components/week/WeekBoard.vue', 'WeekBoardToolbar'],
    ['app/presentation/pages/notes/index.vue', 'StickyNoteCard']
  ])('%s delegates focused UI to %s', (orchestrator, component) => {
    expect(readFileSync(orchestrator, 'utf8')).toContain(`<${component}`)
  })
})
