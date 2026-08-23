import { useDb } from '../../db'
import { stickyNotes } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { createStickyNoteSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, createStickyNoteSchema.parse)
  const now = Date.now()
  const note = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    title: body.title,
    content: body.content,
    color: body.color,
    positionX: body.positionX,
    positionY: body.positionY,
    checkedItems: [],
    done: false,
    noteDate: body.noteDate,
    pinned: body.pinned,
    archivedAt: null,
    sortOrder: now,
    labels: body.labels,
    linkedTaskId: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now
  }
  await useDb(event).insert(stickyNotes).values(note)
  return note
})
