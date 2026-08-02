export type NavigationRole = 'user' | 'pm' | 'admin'

export interface AppNavigationItem {
  label: string
  icon: string
  to: string
  roles?: NavigationRole[]
}

export const appNavigation: AppNavigationItem[] = [
  { label: 'nav.board', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'nav.focus', icon: 'i-lucide-timer', to: '/focus' },
  { label: 'nav.inbox', icon: 'i-lucide-inbox', to: '/inbox' },
  { label: 'nav.goals', icon: 'i-lucide-target', to: '/goals' },
  { label: 'nav.today', icon: 'i-lucide-sun', to: '/today' },
  { label: 'nav.upcoming', icon: 'i-lucide-clock-3', to: '/upcoming' },
  { label: 'nav.overdue', icon: 'i-lucide-triangle-alert', to: '/overdue' },
  { label: 'nav.calendar', icon: 'i-lucide-calendar-days', to: '/calendar' },
  { label: 'nav.timeline', icon: 'i-lucide-gantt-chart', to: '/timeline' },
  { label: 'nav.analytics', icon: 'i-lucide-chart-no-axes-combined', to: '/analytics' },
  { label: 'nav.review', icon: 'i-lucide-sparkles', to: '/review' },
  { label: 'nav.templates', icon: 'i-lucide-copy-plus', to: '/templates' },
  { label: 'nav.notes', icon: 'i-lucide-sticky-note', to: '/notes' },
  { label: 'nav.activity', icon: 'i-lucide-activity', to: '/activity' },
  { label: 'nav.workflows', icon: 'i-lucide-workflow', to: '/workflows' },
  { label: 'nav.archive', icon: 'i-lucide-archive', to: '/archive' },
  { label: 'nav.settings', icon: 'i-lucide-settings-2', to: '/settings' },
  { label: 'nav.team', icon: 'i-lucide-users-round', to: '/team', roles: ['pm', 'admin'] },
  { label: 'nav.admin', icon: 'i-lucide-shield-check', to: '/admin', roles: ['admin'] }
]

export function navigationForRole(role?: NavigationRole) {
  return appNavigation.filter((item) => !item.roles || (role ? item.roles.includes(role) : false))
}
