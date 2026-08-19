import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { reviewProgressEntries } from '../../../db/schema'
import { requireAppUser } from '../../../utils/auth'
import { updateReviewProgressSchema } from '../../../utils/reviewProgressValidators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateReviewProgressSchema.parse)
  const db = useDb(event)
  const result = await db
    .update(reviewProgressEntries)
    .set({ ...body, updatedAt: Date.now() })
    .where(and(eq(reviewProgressEntries.id, id), eq(reviewProgressEntries.ownerId, user.id)))
  if (!result.meta.changes) throw createError({ statusCode: 404, statusMessage: 'Progress entry not found' })
  const [entry] = await db.select().from(reviewProgressEntries).where(eq(reviewProgressEntries.id, id))
  return entry
})
