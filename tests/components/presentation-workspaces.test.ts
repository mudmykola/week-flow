// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const workspaces = [
  ['index', 'week/WeekWorkspace'],
  ['admin/index', 'admin/AdminWorkspace'],
  ['analytics/index', 'analytics/AnalyticsWorkspace'],
  ['inbox/index', 'inbox/InboxWorkspace'],
  ['team/index', 'team/TeamWorkspace'],
  ['workflows/index', 'workflow/WorkflowWorkspace']
] as const

describe('presentation workspace boundaries', () => {
  it.each(workspaces)('keeps %s as a thin route entry', (route, component) => {
    const page = read(`app/presentation/pages/${route}.vue`)
    const name = component.split('/').at(-1)

    expect(page).toContain(`<${name}`)
    expect(page).not.toContain('<script')
    expect(page.split('\n').length).toBeLessThanOrEqual(5)
  })

  it('decomposes large workspaces into focused feature panels', () => {
    const contracts = {
      'app/presentation/components/week/WeekWorkspace.vue': ['WeekInsights', 'WeekTopTasks', 'WeekBulkActions'],
      'app/presentation/components/admin/AdminWorkspace.vue': ['AdminMetrics', 'AdminTabs', 'AdminUsersPanel'],
      'app/presentation/components/analytics/AnalyticsWorkspace.vue': ['AnalyticsFilters', 'AnalyticsAttention'],
      'app/presentation/components/inbox/InboxWorkspace.vue': ['InboxCapture', 'InboxQueue', 'InboxProcessor'],
      'app/presentation/components/team/TeamWorkspace.vue': ['TeamOverview', 'TeamMembersPanel', 'TeamGoalsPanel'],
      'app/presentation/components/workflow/WorkflowWorkspace.vue': ['WorkflowStageForm', 'WorkflowRuleForm']
    }

    for (const [path, components] of Object.entries(contracts)) {
      const workspace = read(path)
      for (const component of components) expect(workspace).toContain(`<${component}`)
    }
  })
})
