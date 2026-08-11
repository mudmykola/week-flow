import { and, eq } from 'drizzle-orm'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { useDb } from '../../../db'
import { goals, inboxItems, projectMembers, projects, stickyNotes, tasks } from '../../../db/schema'
import { requireAssignableUser } from '../../../utils/assigneeAccess'
import { requireAppUser } from '../../../utils/auth'
import { resolveInboxSchema } from '../../../utils/inboxValidators'
import { requireProjectAccess } from '../../../utils/projectAccess'
import { requireManagedTeam } from '../../../utils/teamAccess'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, resolveInboxSchema.parse)
  const db = useDb(event)
  const [item] = await db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.id, id), eq(inboxItems.ownerId, user.id)))
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Inbox item not found' })
  if (body.projectId) await requireProjectAccess(event, body.projectId, true)
  await requireAssignableUser(event, body.assigneeId)

  const entityId = crypto.randomUUID()
  const now = Date.now()
  if (body.destination === 'goal') {
    const { manager, team } = await requireManagedTeam(event)
    await db.batch([
      db.insert(goals).values({
        id: entityId,
        teamId: team.id,
        assigneeId: manager.id,
        title: item.content.slice(0, 200),
        description: null,
        progress: 0,
        status: 'active',
        dueDate: body.dueDate ?? null,
        projectId: null,
        createdBy: manager.id,
        createdAt: now,
        updatedAt: now
      }),
      db.delete(inboxItems).where(eq(inboxItems.id, id))
    ])
  } else if (body.destination === 'sticky') {
    await db.batch([
      db.insert(stickyNotes).values({
        id: entityId,
        ownerId: user.id,
        content: item.content,
        color: 'yellow',
        positionX: 24,
        positionY: 24,
        checkedItems: [],
        done: false,
        createdAt: now,
        updatedAt: now
      }),
      db.delete(inboxItems).where(eq(inboxItems.id, id))
    ])
  } else if (body.destination === 'project') {
    await db.batch([
      db
        .insert(projects)
        .values({ id: entityId, ownerId: user.id, name: item.content.slice(0, 80), color: '#FF4F14', createdAt: now }),
      db.insert(projectMembers).values({ projectId: entityId, userId: user.id, role: 'owner', createdAt: now }),
      db.delete(inboxItems).where(eq(inboxItems.id, id))
    ])
  } else {
    const current = new Date()
    const week = `${getISOWeekYear(current)}-W${String(getISOWeek(current)).padStart(2, '0')}`
    await db.batch([
      db.insert(tasks).values({
        id: entityId,
        ownerId: user.id,
        title: item.content,
        note: null,
        status: 'todo',
        projectId: body.projectId ?? null,
        week,
        sort: now,
        createdAt: now,
        doneAt: null,
        priority: 'medium',
        dueDate: body.dueDate ?? null,
        plannedDate: body.destination === 'today' ? body.plannedDate! : (body.plannedDate ?? null),
        plannedTime: null,
        estimateMinutes: null,
        dayRank: null,
        tags: [],
        recurrence: null,
        archivedAt: null,
        assigneeId: body.assigneeId ?? null,
        stageId: null
      }),
      db.delete(inboxItems).where(eq(inboxItems.id, id))
    ])
  }
  return { ok: true as const, destination: body.destination, entityId }
})
