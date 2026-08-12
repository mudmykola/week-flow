import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const primitive = read('app/presentation/components/base/BoundedTaskList.vue')

describe('bounded task list UX contract', () => {
  it('provides a persisted, accessible preview and bounded expanded viewport', () => {
    expect(primitive).toContain('useLocalStorage')
    expect(primitive).toContain(':aria-expanded="expanded"')
    expect(primitive).toContain(':aria-controls="contentId"')
    expect(primitive).toContain('max-height: min(58vh, 38rem)')
    expect(primitive).toContain('overflow-y: auto')
    expect(primitive).toContain('overscroll-behavior: contain')
  })

  it.each([
    'app/presentation/components/week/WeekBoardV3.vue',
    'app/presentation/components/today/TodayTimeZone.vue',
    'app/presentation/components/today/TodayWorkspace.vue',
    'app/presentation/components/task/TaskListView.vue',
    'app/presentation/components/review/ReviewTaskSection.vue',
    'app/presentation/components/focus/FocusQueue.vue',
    'app/presentation/pages/delegation/index.vue',
    'app/presentation/pages/analytics/index.vue',
    'app/presentation/pages/workflows/index.vue'
  ])('bounds long collections in %s', (path) => {
    expect(read(path)).toContain('<BoundedTaskList')
  })

  it('keeps drag-and-drop edge scrolling enabled on board lanes', () => {
    const board = read('app/presentation/components/week/WeekBoardV3.vue')
    expect(board).toContain(':scroll="true"')
    expect(board).toContain(':scroll-sensitivity="80"')
  })
})
