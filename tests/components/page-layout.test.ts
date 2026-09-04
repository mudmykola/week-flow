// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const pageRoots = [
  'app/presentation/pages/index.vue',
  'app/presentation/pages/activity/index.vue',
  'app/presentation/pages/admin/index.vue',
  'app/presentation/pages/analytics/index.vue',
  'app/presentation/pages/backlog/index.vue',
  'app/presentation/pages/capacity/index.vue',
  'app/presentation/pages/delegation/index.vue',
  'app/presentation/pages/focus/index.vue',
  'app/presentation/pages/goals/index.vue',
  'app/presentation/pages/inbox/index.vue',
  'app/presentation/pages/notes/index.vue',
  'app/presentation/pages/projects/index.vue',
  'app/presentation/pages/projects/[id]/index.vue',
  'app/presentation/pages/settings/index.vue',
  'app/presentation/pages/team/index.vue',
  'app/presentation/pages/workflows/index.vue',
  'app/presentation/components/calendar/CalendarWorkspace.vue',
  'app/presentation/components/review/ReviewWorkspace.vue',
  'app/presentation/components/task/TaskListView.vue',
  'app/presentation/components/today/TodayWorkspace.vue'
]

describe('Shared authenticated page geometry', () => {
  it('uses one app container for every primary workspace', () => {
    for (const path of pageRoots) {
      const source = read(path)
      expect(source, `${path} must use app-container`).toContain('app-container')
      expect(source, `${path} must not constrain the route root with Tailwind max-width`).not.toMatch(
        /app-container[^"\n]*max-w-/
      )
    }
  })

  it('owns width, centering and page padding in the shared container only', () => {
    const css = read('app/presentation/assets/css/main.css')
    expect(css).toMatch(
      /\.app-container\s*{[^}]*width:\s*100%;[^}]*max-width:\s*1536px;[^}]*margin-inline:\s*auto;[^}]*padding:\s*var\(--space-page-y\) var\(--space-page-x\) 2rem;/s
    )
    expect(css).not.toContain('.board-workspace {\n  max-width:')
  })

  it('does not restore legacy page-specific outer widths', () => {
    const sources = pageRoots.map(read).join('\n')
    expect(sources).not.toMatch(/max-width:\s*(68rem|72rem|1350px|1500px|1800px)/)
  })
})
