import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { inboxItems } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { updateInboxSchema } from '../../utils/inboxValidators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateInboxSchema.parse)
  const db = useDb(event)
  await db
    .update(inboxItems)
    .set({ content: body.content, updatedAt: Date.now() })
    .where(and(eq(inboxItems.id, id), eq(inboxItems.ownerId, user.id)))
  const [item] = await db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.id, id), eq(inboxItems.ownerId, user.id)))
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Inbox item not found' })
  return item
})
