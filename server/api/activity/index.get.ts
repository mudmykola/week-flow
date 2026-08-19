import { and, desc, eq, gte, like, lt, ne, or, sql } from 'drizzle-orm'
import { useDb } from '../../db'
import { activityLogs, goals, projects, tasks, users } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

const allowedActions = new Set([
  'task.created',
  'task.updated',
  'task.deleted',
  'subtask.created',
  'subtask.updated',
  'subtask.completed',
  'comment.created',
  'goal.created',
  'goal.progress_updated',
  'goal.project_linked',
  'goal.project_unlinked'
])
const allowedEntities = new Set(['task', 'project', 'goal'])

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
  const action = typeof query.action === 'string' && allowedActions.has(query.action) ? query.action : null
  const entity = typeof query.entity === 'string' && allowedEntities.has(query.entity) ? query.entity : null
  const actor = typeof query.actor === 'string' ? query.actor.slice(0, 64) : ''
  const project = typeof query.project === 'string' ? query.project.slice(0, 64) : ''
  const scope = ['mine', 'team', 'all'].includes(String(query.scope)) ? String(query.scope) : 'mine'
  const exporting = query.format === 'csv'
  const period = Math.min(365, Math.max(0, Number(query.period) || 0))
  const limit = exporting ? 1000 : Math.min(50, Math.max(10, Number(query.limit) || 24))
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
      entityTitle: sql<string | null>`coalesce(${tasks.title}, ${goals.title})`,
      projectName: projects.name,
      projectColor: projects.color
    })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.actorId))
    .leftJoin(tasks, eq(tasks.id, activityLogs.entityId))
    .leftJoin(goals, eq(goals.id, activityLogs.entityId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        eq(activityLogs.ownerId, user.id),
        action ? eq(activityLogs.action, action) : undefined,
        entity ? eq(activityLogs.entityType, entity) : undefined,
        actor ? eq(activityLogs.actorId, actor) : undefined,
        project ? eq(tasks.projectId, project) : undefined,
        scope === 'mine'
          ? eq(activityLogs.actorId, user.id)
          : scope === 'team'
            ? ne(activityLogs.actorId, user.id)
            : undefined,
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
              like(goals.title, pattern),
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
  if (exporting) {
    setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'content-disposition', `attachment; filename="weekflow-activity-${Date.now()}.csv"`)
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    return [
      'date,actor,action,entity,project',
      ...items.map((item) =>
        [new Date(item.createdAt).toISOString(), item.actorName, item.action, item.entityTitle, item.projectName]
          .map(escape)
          .join(',')
      )
    ].join('\n')
  }
  return {
    items,
    nextCursor: hasMore && last ? `${last.createdAt}_${last.id}` : null
  }
})
