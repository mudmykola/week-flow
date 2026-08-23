export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green'

export interface StickyNote {
  id: string
  title: string
  content: string
  color: StickyNoteColor
  positionX: number
  positionY: number
  checkedItems: number[]
  done: boolean
  noteDate: string | null
  pinned: boolean
  archivedAt: number | null
  sortOrder: number
  labels: string[]
  linkedTaskId: string | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateStickyNoteInput {
  title?: string
  content: string
  color?: StickyNoteColor
  positionX?: number
  positionY?: number
  noteDate?: string | null
  pinned?: boolean
  labels?: string[]
}

export type UpdateStickyNoteInput = Partial<
  CreateStickyNoteInput & {
    checkedItems: number[]
    done: boolean
    archivedAt: number | null
    sortOrder: number
    linkedTaskId: string | null
    completedAt: number | null
  }
>
