export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green'

export interface StickyNote {
  id: string
  content: string
  color: StickyNoteColor
  positionX: number
  positionY: number
  checkedItems: number[]
  done: boolean
  createdAt: number
  updatedAt: number
}

export interface CreateStickyNoteInput {
  content: string
  color?: StickyNoteColor
  positionX?: number
  positionY?: number
}

export type UpdateStickyNoteInput = Partial<CreateStickyNoteInput & { checkedItems: number[]; done: boolean }>
