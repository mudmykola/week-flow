import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { dailyReviews } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { saveDailyReviewSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, saveDailyReviewSchema.parse)
  const now = Date.now()
  const value = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    userId: user.id,
    reviewDate: body.reviewDate,
    content: body.content,
    structuredContent: body.structuredContent,
    excludedTaskIds: body.excludedTaskIds,
    status: body.status,
    createdAt: now,
    updatedAt: now,
    submittedAt: body.status === 'submitted' ? now : null
  }
  await useDb(event)
    .insert(dailyReviews)
    .values(value)
    .onConflictDoUpdate({
      target: [dailyReviews.userId, dailyReviews.reviewDate],
      set: {
        content: value.content,
        structuredContent: value.structuredContent,
        excludedTaskIds: value.excludedTaskIds,
        status: value.status,
        updatedAt: now,
        submittedAt: value.submittedAt
      }
    })
  const [saved] = await useDb(event)
    .select()
    .from(dailyReviews)
    .where(and(eq(dailyReviews.userId, user.id), eq(dailyReviews.reviewDate, body.reviewDate)))
  return saved
})
