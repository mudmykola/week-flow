export interface InboxItem {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

export type InboxDestination = 'task' | 'today' | 'sticky' | 'project' | 'goal'

export interface ResolveInboxInput {
  destination: InboxDestination
  projectId?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  plannedDate?: string | null
}
