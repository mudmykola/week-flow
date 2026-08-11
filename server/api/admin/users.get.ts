import { asc, desc, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { activityLogs, projectMembers, projects, tasks, teamMembers, teams, users } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'
import { calendarDateKey } from '#shared/utils/date'

export default defineEventHandler(async (event) => {
  const actor = await requireAppUser(event)
  if (!isAdmin(actor)) throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  const db = useDb(event)
  const [accounts, taskRows, projectRows, projectMemberRows, teamRows, memberRows, recentActivity] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .orderBy(asc(users.createdAt)),
    db
      .select({
        id: tasks.id,
        ownerId: tasks.ownerId,
        assigneeId: tasks.assigneeId,
        status: tasks.status,
        dueDate: tasks.dueDate,
        archivedAt: tasks.archivedAt
      })
      .from(tasks),
    db.select({ id: projects.id, ownerId: projects.ownerId }).from(projects),
    db.select().from(projectMembers),
    db
      .select({ id: teams.id, name: teams.name, managerId: teams.managerId, managerName: users.name })
      .from(teams)
      .innerJoin(users, eq(teams.managerId, users.id))
      .orderBy(asc(teams.createdAt)),
    db.select().from(teamMembers),
    db
      .select({ actorId: activityLogs.actorId, ownerId: activityLogs.ownerId, createdAt: activityLogs.createdAt })
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(500)
  ])
  const today = calendarDateKey()
  const enriched = accounts.map((account) => {
    const assigned = taskRows.filter((task) => task.assigneeId === account.id && !task.archivedAt)
    const ownedProjects = projectRows.filter((project) => project.ownerId === account.id).map((project) => project.id)
    const projectIds = new Set([
      ...ownedProjects,
      ...projectMemberRows.filter((member) => member.userId === account.id).map((member) => member.projectId)
    ])
    const teamIds = new Set([
      ...teamRows.filter((team) => team.managerId === account.id).map((team) => team.id),
      ...memberRows.filter((member) => member.userId === account.id).map((member) => member.teamId)
    ])
    return {
      ...account,
      taskTotal: assigned.length,
      taskDone: assigned.filter((task) => task.status === 'done').length,
      taskOverdue: assigned.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length,
      projectCount: projectIds.size,
      teamCount: teamIds.size,
      lastActivityAt:
        recentActivity.find((entry) => entry.actorId === account.id || entry.ownerId === account.id)?.createdAt ?? null
    }
  })
  const activeTasks = taskRows.filter((task) => !task.archivedAt)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return {
    users: enriched,
    teams: teamRows.map((team) => ({
      ...team,
      memberCount: new Set(memberRows.filter((member) => member.teamId === team.id).map((member) => member.userId)).size
    })),
    metrics: {
      users: accounts.length,
      admins: accounts.filter((account) => account.role === 'admin').length,
      managers: accounts.filter((account) => account.role === 'pm').length,
      disabled: accounts.filter((account) => account.disabledAt).length,
      newUsers: accounts.filter((account) => account.createdAt >= cutoff).length,
      teams: teamRows.length,
      projects: projectRows.length,
      tasks: activeTasks.length,
      overdue: activeTasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length
    }
  }
})
