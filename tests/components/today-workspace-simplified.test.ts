// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('Simplified Today workspace', () => {
  const workspace = read('app/presentation/components/today/TodayWorkspace.vue')
  const nowCard = read('app/presentation/components/today/TodayNowCard.vue')
  const nowCardStyles = read('app/presentation/assets/css/components/today/today-now-card.css')
  const quickCreate = read('app/presentation/components/task/TaskQuickCreate.vue')
  const quickCreateStyles = read('app/presentation/assets/css/components/task/task-quick-create.css')

  it('prioritizes Now, one daily plan and progressive disclosure', () => {
    expect(workspace).toContain('<TodayNowCard')
    expect(workspace).toContain("$t('pages.today.planTitle')")
    expect(workspace).toContain('storage-key="today-daily-plan"')
    expect(workspace).toContain('v-if="view === \'list\' && filtersOpen"')
    expect(workspace).not.toContain('v-for="section in [')
    expect(workspace).not.toContain('<TodayCommandCenter')
  })

  it('keeps scheduling optional and defaults new users to the plan', () => {
    expect(workspace).toContain("'weekflow-today-view-v3', 'list'")
    expect(workspace).toContain("view = 'timeline'")
    expect(workspace).toContain('<TodayTimePlanner')
    expect(nowCard).toContain('today-now-card__task')
    expect(nowCard).toContain("emit('focus')")
  })

  it('uses calm neutral surfaces instead of warning-like activity borders', () => {
    expect(nowCardStyles).toContain('border-color: var(--color-panel-border)')
    expect(nowCardStyles).toContain('background: var(--color-panel-bg)')
    expect(nowCardStyles).not.toContain('var(--color-accent) 38%')
    expect(quickCreate).toContain('class="task-quick-create surface-card"')
    expect(quickCreateStyles).toContain('.task-quick-create:focus-within')
    expect(quickCreateStyles).not.toContain('shadow-lg')
  })
})
