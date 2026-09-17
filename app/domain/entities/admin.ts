export type AdminRole = 'user' | 'pm' | 'admin'

export interface AdminUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: AdminRole
  disabledAt: number | null
  createdAt: number
  updatedAt: number
  taskTotal: number
  taskDone: number
  taskOverdue: number
  projectCount: number
  teamCount: number
  lastActivityAt: number | null
}

export interface AdminTeam {
  id: string
  name: string
  managerId: string
  managerName: string
  memberCount: number
}

export interface AdminMetrics {
  users: number
  admins: number
  managers: number
  disabled: number
  newUsers: number
  teams: number
  projects: number
  tasks: number
  overdue: number
}

export interface AdminData {
  users: AdminUser[]
  teams: AdminTeam[]
  metrics: AdminMetrics
}

export interface AdminAuditEntry {
  id: string
  action: string
  metadata: Record<string, unknown>
  createdAt: number
  actor: { id: string; name: string; email: string } | null
  target: { id: string; name: string; email: string } | null
}

export type AdminPendingAction =
  | { type: 'role'; account: AdminUser; role: AdminRole }
  | { type: 'status'; account: AdminUser; disabled: boolean }
  | { type: 'bulk-role'; role: AdminRole }
  | { type: 'bulk-status'; disabled: boolean }
  | null
