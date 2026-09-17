import type { Goal } from './goal'

export interface TeamSummary {
  id: string
  name: string
  managerId: string
  managerName?: string
}

export interface TeamMemberSummary {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role?: string
  taskTotal: number
  taskDone: number
  taskActive: number
  taskOverdue: number
  goalCount?: number
  goalProgress?: number
}

export interface TeamMetrics {
  tasks: number
  done: number
  goalProgress: number
}

export interface TeamWorkspaceData {
  team: TeamSummary | null
  teams: TeamSummary[]
  members: TeamMemberSummary[]
  goals: Goal[]
  metrics: TeamMetrics
}
