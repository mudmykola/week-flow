export type NavigationRole = 'user' | 'pm' | 'admin'
export type NavigationSection = 'work' | 'planning' | 'review' | 'team' | 'system'

export interface AppNavigationItem {
  label: string
  icon: string
  to: string
  section: NavigationSection
  roles?: NavigationRole[]
}

export const appNavigation: AppNavigationItem[] = [
  { label: 'nav.today', icon: 'i-lucide-sun', to: '/today', section: 'work' },
  { label: 'nav.board', icon: 'i-lucide-layout-dashboard', to: '/', section: 'work' },
  { label: 'nav.inbox', icon: 'i-lucide-inbox', to: '/inbox', section: 'work' },
  { label: 'nav.focus', icon: 'i-lucide-timer', to: '/focus', section: 'work' },
  { label: 'nav.calendar', icon: 'i-lucide-calendar-days', to: '/calendar', section: 'planning' },
  { label: 'nav.goals', icon: 'i-lucide-target', to: '/goals', section: 'planning' },
  { label: 'nav.notes', icon: 'i-lucide-sticky-note', to: '/notes', section: 'planning' },
  { label: 'nav.review', icon: 'i-lucide-sparkles', to: '/review', section: 'review' },
  { label: 'nav.analytics', icon: 'i-lucide-chart-no-axes-combined', to: '/analytics', section: 'review' },
  { label: 'nav.activity', icon: 'i-lucide-activity', to: '/activity', section: 'review' },
  { label: 'nav.team', icon: 'i-lucide-users-round', to: '/team', section: 'team', roles: ['pm', 'admin'] },
  { label: 'nav.delegation', icon: 'i-lucide-git-pull-request-arrow', to: '/delegation', section: 'team' },
  { label: 'nav.workflows', icon: 'i-lucide-workflow', to: '/workflows', section: 'team' },
  { label: 'nav.settings', icon: 'i-lucide-settings-2', to: '/settings', section: 'system' },
  { label: 'nav.admin', icon: 'i-lucide-shield-check', to: '/admin', section: 'system', roles: ['admin'] }
]

export const navigationSections: NavigationSection[] = ['work', 'planning', 'review', 'team', 'system']

export function navigationForRole(role?: NavigationRole) {
  return appNavigation.filter((item) => !item.roles || (role ? item.roles.includes(role) : false))
}

export function taskBoardLink(task: { id: string; week: string; projectId?: string | null; priority?: string }) {
  return {
    path: '/',
    query: {
      week: task.week,
      task: task.id,
      project: task.projectId ?? undefined,
      priority: task.priority
    }
  }
}
