import { and, desc, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { dailyReviews } from '../../db/schema'
import { dateSchema } from '../../utils/validators'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const query = getQuery(event)
  const date = typeof query.date === 'string' ? dateSchema.parse(query.date) : null
  const history = await useDb(event)
    .select()
    .from(dailyReviews)
    .where(eq(dailyReviews.userId, user.id))
    .orderBy(desc(dailyReviews.reviewDate))
    .limit(90)
  return { review: date ? (history.find((item) => item.reviewDate === date) ?? null) : null, history }
})
