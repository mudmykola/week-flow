export type NavigationRole = 'user' | 'pm' | 'admin'
export type NavigationSection = 'daily' | 'insights' | 'team'

export interface AppNavigationItem {
  label: string
  icon: string
  to: string
  section: NavigationSection
  roles?: NavigationRole[]
}

export const appNavigation: AppNavigationItem[] = [
  { label: 'nav.board', icon: 'i-lucide-layout-dashboard', to: '/', section: 'daily' },
  { label: 'nav.focus', icon: 'i-lucide-timer', to: '/focus', section: 'daily' },
  { label: 'nav.inbox', icon: 'i-lucide-inbox', to: '/inbox', section: 'daily' },
  { label: 'nav.today', icon: 'i-lucide-sun', to: '/today', section: 'daily' },
  { label: 'nav.goals', icon: 'i-lucide-target', to: '/goals', section: 'insights' },
  { label: 'nav.calendar', icon: 'i-lucide-calendar-days', to: '/calendar', section: 'insights' },
  { label: 'nav.analytics', icon: 'i-lucide-chart-no-axes-combined', to: '/analytics', section: 'insights' },
  { label: 'nav.review', icon: 'i-lucide-sparkles', to: '/review', section: 'insights' },
  { label: 'nav.notes', icon: 'i-lucide-sticky-note', to: '/notes', section: 'insights' },
  { label: 'nav.activity', icon: 'i-lucide-activity', to: '/activity', section: 'insights' },
  { label: 'nav.settings', icon: 'i-lucide-settings-2', to: '/settings', section: 'team' },
  { label: 'nav.team', icon: 'i-lucide-users-round', to: '/team', section: 'team', roles: ['pm', 'admin'] },
  { label: 'nav.admin', icon: 'i-lucide-shield-check', to: '/admin', section: 'team', roles: ['admin'] }
]

export const navigationSections: NavigationSection[] = ['daily', 'insights', 'team']

export function navigationForRole(role?: NavigationRole) {
  return appNavigation.filter((item) => !item.roles || (role ? item.roles.includes(role) : false))
}
