// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const taskSurfaces = [
  'ReviewStandupSummary',
  'ReviewTaskSection',
  'ReviewDecisionQueue',
  'ReviewDailyBrief',
  'ReviewTimeline'
]

describe('review task navigation', () => {
  it.each(taskSurfaces)('keeps task opening behind an explicit action in %s', (component) => {
    const source = read(`app/presentation/components/review/${component}.vue`)

    expect(source).toContain('i-lucide-square-arrow-out-up-right')
    expect(source).toContain('pages.review.progress.openTask')
  })

  it('does not make review summaries or task collections one large navigation button', () => {
    for (const component of taskSurfaces) {
      const source = read(`app/presentation/components/review/${component}.vue`)
      expect(source).not.toMatch(/<button[^>]*\s+v-for="(?:task|briefItem|event) in[^>]*>/s)
    }
  })
})
