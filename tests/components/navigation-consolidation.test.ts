// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('consolidated product navigation', () => {
  it('keeps advanced destinations contextual and searchable without crowding the sidebar', () => {
    const navigation = source('app/domain/services/navigation.ts')
    const shell = source('app/presentation/components/shell/AppShell.vue')

    expect(navigation).toContain("to: '/projects'")
    expect(navigation.match(/visibility: 'contextual'/g)).toHaveLength(5)
    expect(navigation).toContain("to: '/inbox'")
    expect(navigation).toContain("roles: ['pm', 'admin']")
    expect(shell).toContain('searchableNavigation')
    expect(shell).toContain('sidebarNavigationForRole')
  })

  it('exposes reporting from Review and delegation from Team', () => {
    const review = source('app/presentation/components/review/ReviewWorkspace.vue')
    const team = source('app/presentation/components/team/TeamWorkspace.vue')

    expect(review).toContain('<NuxtLink to="/analytics">')
    expect(review).toContain('<NuxtLink to="/activity">')
    expect(team).toContain("navigateTo('/delegation')")
    expect(team).toContain("navigateTo('/workflows')")
  })

  it('keeps compatibility redirects and protects workflow configuration by role', () => {
    const templates = source('app/presentation/pages/templates/index.vue')
    const workflows = source('app/presentation/components/workflow/WorkflowWorkspace.vue')

    expect(templates).toContain("navigateTo('/settings#templates'")
    expect(workflows).toContain("user.value?.role !== 'pm'")
    expect(workflows).toContain("user.value?.role !== 'admin'")
  })

  it('provides project index and detail workspaces with contextual routes', () => {
    const index = source('app/presentation/pages/projects/index.vue')
    const detail = source('app/presentation/pages/projects/[id]/index.vue')

    expect(index).toContain('projects-page app-container')
    expect(index).toContain('ProjectEditor')
    expect(detail).toContain('project-page app-container')
    expect(detail).toContain("path: '/activity'")
    expect(detail).toContain("path: '/workflows'")
  })
})
