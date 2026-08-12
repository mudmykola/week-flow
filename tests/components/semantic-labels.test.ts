import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('semantic labels UI contract', () => {
  it('defines accessible semantic tones for both themes', () => {
    const css = read('app/presentation/assets/css/main.css')
    for (const token of ['success', 'info', 'warning', 'danger', 'violet', 'neutral'])
      expect(css).toContain(`--color-${token}`)
    const badge = read('app/presentation/components/common/SemanticBadge.vue')
    expect(badge).toContain('<slot>{{ label }}</slot>')
    expect(badge).toContain('UIcon')
  })

  it.each([
    'app/presentation/components/task/TaskCard.vue',
    'app/presentation/components/today/TodayTimeTaskCard.vue',
    'app/presentation/components/week/WeekBoardV3.vue',
    'app/presentation/components/review/ReviewTaskSection.vue',
    'app/presentation/pages/admin/index.vue',
    'app/presentation/pages/workflows/index.vue',
    'app/presentation/pages/analytics/index.vue'
  ])('uses semantic indicators in %s', (path) => {
    expect(read(path)).toMatch(/<(SemanticBadge|SemanticDot|PriorityBadge|StatusBadge)/)
  })
})
