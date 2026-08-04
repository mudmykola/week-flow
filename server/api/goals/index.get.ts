import { eq, getTableColumns } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals, projects } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { withComputedProgress } from '../../utils/goals'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const db = useDb(event)
  const rows = await db
    .select({ ...getTableColumns(goals), projectName: projects.name, projectColor: projects.color })
    .from(goals)
    .leftJoin(projects, eq(projects.id, goals.projectId))
    .where(eq(goals.assigneeId, user.id))
    .orderBy(goals.createdAt)
  return withComputedProgress(db, rows)
})
