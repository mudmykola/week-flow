import { and, desc, eq, gte, like, lt, or } from 'drizzle-orm'
import { useDb } from '../../db'
import { activityLogs, projects, tasks, users } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

const allowedActions = new Set(['task.created', 'task.updated', 'task.deleted', 'subtask.created', 'comment.created'])
const allowedEntities = new Set(['task', 'project'])

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
  const action = typeof query.action === 'string' && allowedActions.has(query.action) ? query.action : null
  const entity = typeof query.entity === 'string' && allowedEntities.has(query.entity) ? query.entity : null
  const actor = typeof query.actor === 'string' ? query.actor.slice(0, 64) : ''
  const project = typeof query.project === 'string' ? query.project.slice(0, 64) : ''
  const period = Math.min(365, Math.max(0, Number(query.period) || 0))
  const limit = Math.min(50, Math.max(10, Number(query.limit) || 24))
  const cursor = typeof query.cursor === 'string' ? query.cursor : ''
  const separator = cursor.indexOf('_')
  const cursorTime = separator > 0 ? Number(cursor.slice(0, separator)) : 0
  const cursorId = separator > 0 ? cursor.slice(separator + 1) : ''
  const pattern = `%${search}%`

  const rows = await useDb(event)
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
      actorAvatar: users.avatarUrl,
      entityTitle: tasks.title,
      projectName: projects.name,
      projectColor: projects.color
    })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.actorId))
    .leftJoin(tasks, eq(tasks.id, activityLogs.entityId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        eq(activityLogs.ownerId, user.id),
        action ? eq(activityLogs.action, action) : undefined,
        entity ? eq(activityLogs.entityType, entity) : undefined,
        actor ? eq(activityLogs.actorId, actor) : undefined,
        project ? eq(tasks.projectId, project) : undefined,
        period ? gte(activityLogs.createdAt, Date.now() - period * 86_400_000) : undefined,
        cursorTime
          ? or(
              lt(activityLogs.createdAt, cursorTime),
              and(eq(activityLogs.createdAt, cursorTime), lt(activityLogs.id, cursorId))
            )
          : undefined,
        search
          ? or(
              like(users.name, pattern),
              like(activityLogs.action, pattern),
              like(tasks.title, pattern),
              like(projects.name, pattern)
            )
          : undefined
      )
    )
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  return {
    items,
    nextCursor: hasMore && last ? `${last.createdAt}_${last.id}` : null
  }
})
