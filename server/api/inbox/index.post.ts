import { useDb } from '../../db'
import { inboxItems } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { captureInboxSchema } from '../../utils/inboxValidators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const { content } = await readValidatedBody(event, captureInboxSchema.parse)
  const now = Date.now()
  const items = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((line, index) => ({
      id: crypto.randomUUID(),
      ownerId: user.id,
      content: line.slice(0, 500),
      createdAt: now + index,
      updatedAt: now + index
    }))
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'No inbox items' })
  await useDb(event).insert(inboxItems).values(items)
  return items.reverse()
})
