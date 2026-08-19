import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('activity center architecture', () => {
  it('keeps the page composed from operational activity components', async () => {
    const page = await source('app/presentation/pages/activity/index.vue')
    expect(page).toContain('<ActivityScopeTabs')
    expect(page).toContain('<ActivitySummary')
    expect(page).toContain('<ActivityAttentionQueue')
    expect(page).toContain('checkForNew')
    expect(page).toContain(':last-seen="lastSeen"')
  })

  it('keeps owner isolation and server-side filtered export in the activity API', async () => {
    const api = await source('server/api/activity/index.get.ts')
    expect(api).toContain('eq(activityLogs.ownerId, user.id)')
    expect(api).toContain("query.format === 'csv'")
    expect(api).toContain("'subtask.completed'")
    expect(api).toContain("'subtask.updated'")
  })

  it('uses progressive filters instead of exposing every control at once', async () => {
    const filters = await source('app/presentation/components/activity/ActivityFilters.vue')
    expect(filters).toContain('advancedOpen')
    expect(filters).toContain('activity-filters__advanced')
    expect(filters).toContain('i-lucide-sliders-horizontal')
  })
})
