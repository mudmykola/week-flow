// @vitest-environment node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  appNavigation,
  navigationForRole,
  navigationSections,
  taskBoardLink
} from '../../app/domain/services/navigation'

describe('application navigation', () => {
  it('maps every shell destination to an existing Nuxt page', () => {
    for (const item of appNavigation) {
      const page = item.to === '/' ? 'index.vue' : `${item.to.slice(1)}/index.vue`
      expect(existsSync(resolve('app/presentation/pages', page)), `${item.to} is missing`).toBe(true)
    }
  })

  it('keeps destinations unique and respects role boundaries', () => {
    expect(new Set(appNavigation.map((item) => item.to)).size).toBe(appNavigation.length)
    expect(navigationForRole('user').some((item) => item.to === '/analytics')).toBe(true)
    expect(navigationForRole('user').some((item) => item.to === '/admin')).toBe(false)
    expect(navigationForRole('pm').some((item) => item.to === '/team')).toBe(true)
    expect(navigationForRole('admin').some((item) => item.to === '/admin')).toBe(true)
  })

  it('orders navigation by user intent and keeps system destinations separate', () => {
    expect(navigationSections).toEqual(['work', 'planning', 'review', 'team', 'system'])
    expect(appNavigation.filter((item) => item.section === 'work').map((item) => item.to)).toEqual([
      '/today',
      '/',
      '/inbox',
      '/focus'
    ])
    expect(appNavigation.find((item) => item.to === '/workflows')?.section).toBe('team')
    expect(appNavigation.filter((item) => item.section === 'system').map((item) => item.to)).toEqual([
      '/settings',
      '/admin'
    ])
  })

  it('preserves the selected task when navigating back to the board', () => {
    expect(taskBoardLink({ id: 'task-1', week: '2026-W33', projectId: 'project-1', priority: 'high' })).toEqual({
      path: '/',
      query: { week: '2026-W33', task: 'task-1', project: 'project-1', priority: 'high' }
    })
  })

  it('omits the project query when the task has no project', () => {
    expect(taskBoardLink({ id: 'task-1', week: '2026-W33', projectId: null })).toEqual({
      path: '/',
      query: { week: '2026-W33', task: 'task-1', project: undefined, priority: undefined }
    })
  })
})
