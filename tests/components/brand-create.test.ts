import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Brand and Global Create 2.0 contracts', () => {
  it('uses one reusable brand component across primary product surfaces', () => {
    expect(read('app/presentation/components/brand/BrandLogo.vue')).toContain('brand-logo__mark')
    expect(read('app/presentation/components/shell/ShellSidebar.vue')).toContain('<BrandLogo')
    expect(read('app/presentation/pages/login/index.vue')).toContain('<BrandLogo')
    expect(read('app/presentation/components/common/AppPreloader.vue')).toContain('<BrandLogo')
  })

  it('offers all global creation actions with mobile and keyboard support', () => {
    const menu = read('app/presentation/components/shell/GlobalCreateMenu.vue')
    const shell = read('app/presentation/components/shell/AppShell.vue')
    for (const action of ['task', 'today', 'inbox', 'note', 'project']) expect(menu).toContain(`id: '${action}'`)
    expect(menu).toContain('global-create__backdrop')
    expect(shell).toContain("onKeyStroke('n'")
    expect(shell).toContain('handleCreateAction')
    expect(shell).toContain('submitQuickCreate')
    expect(shell).toContain('taskBoardLink(task)')
  })

  it('publishes modern browser, Apple and PWA icon declarations', () => {
    const config = read('nuxt.config.ts')
    expect(config).toContain('/weekflow-mark.svg')
    expect(config).toContain('/apple-touch-icon.png')
    expect(config).toContain('/pwa-192x192.png')
    expect(config).toContain('/pwa-512x512.png')
  })

  it('keeps login semantics and an OAuth-safe create trigger', () => {
    const login = read('app/presentation/pages/login/index.vue')
    const focus = read('app/presentation/pages/focus/index.vue')
    expect(login).toContain('<h1 class="sr-only">WeekFlow</h1>')
    expect(login).toContain('#b93800')
    expect(focus).toContain("globalCreateBus.emit('task')")
    expect(focus).not.toContain('/?new=1')
  })

  it('keeps Today and Inbox counters visible when the desktop sidebar is collapsed', () => {
    const shell = read('app/presentation/components/shell/AppShell.vue')
    const sidebar = read('app/presentation/components/shell/ShellSidebar.vue')
    expect(shell).toContain('todayNavigationCount(tasksStore.listTasks, today.value)')
    expect(shell).toContain('tasksStore.syncListTask(task)')
    expect(sidebar).toContain("'lg:absolute lg:top-1 lg:right-1 lg:min-w-4 lg:px-1 lg:text-[9px]'")
    expect(sidebar).not.toContain("item.to === '/today' && overdueCount")
  })
})
