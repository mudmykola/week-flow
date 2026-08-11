import { eq, getTableColumns, inArray } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals, projects, tasks, teamMembers, teams, users } from '../../db/schema'
import { isAdmin, requireManager } from '../../utils/auth'
import { withComputedProgress } from '../../utils/goals'
import { calendarDateKey } from '#shared/utils/date'

export default defineEventHandler(async (event) => {
  const manager = await requireManager(event)
  const db = useDb(event)
  const availableTeams = isAdmin(manager)
    ? await db
        .select({ id: teams.id, name: teams.name, managerId: teams.managerId, managerName: users.name })
        .from(teams)
        .innerJoin(users, eq(teams.managerId, users.id))
        .orderBy(teams.createdAt)
    : await db
        .select({ id: teams.id, name: teams.name, managerId: teams.managerId, managerName: users.name })
        .from(teams)
        .innerJoin(users, eq(teams.managerId, users.id))
        .where(eq(teams.managerId, manager.id))
        .orderBy(teams.createdAt)
  const requestedId = typeof getQuery(event).team === 'string' ? String(getQuery(event).team) : undefined
  const selected = (requestedId ? availableTeams.find((item) => item.id === requestedId) : availableTeams[0]) ?? null
  if (!selected)
    return {
      team: null,
      teams: availableTeams,
      members: [],
      goals: [],
      metrics: { tasks: 0, done: 0, goalProgress: 0 }
    }
  const [team] = await db.select().from(teams).where(eq(teams.id, selected.id))
  if (!team) throw createError({ statusCode: 404 })

  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, role: users.role })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id))
  const ids = members.map((member) => member.id)
  const memberTasks = ids.length
    ? await db
        .select({
          id: tasks.id,
          title: tasks.title,
          assigneeId: tasks.assigneeId,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          week: tasks.week,
          archivedAt: tasks.archivedAt
        })
        .from(tasks)
        .where(inArray(tasks.assigneeId, ids))
    : []
  const rawGoals = await db
    .select({ ...getTableColumns(goals), projectName: projects.name, projectColor: projects.color })
    .from(goals)
    .leftJoin(projects, eq(projects.id, goals.projectId))
    .where(eq(goals.teamId, team.id))
    .orderBy(goals.createdAt)
  const teamGoals = await withComputedProgress(db, rawGoals)
  const today = calendarDateKey()

  const enriched = members.map((member) => {
    const ownTasks = memberTasks.filter((task) => task.assigneeId === member.id && !task.archivedAt)
    const ownGoals = teamGoals.filter((goal) => goal.assigneeId === member.id)
    return {
      ...member,
      taskTotal: ownTasks.length,
      taskDone: ownTasks.filter((task) => task.status === 'done').length,
      taskActive: ownTasks.filter((task) => task.status === 'in_progress').length,
      taskOverdue: ownTasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length,
      goalCount: ownGoals.length,
      goalProgress: ownGoals.length
        ? Math.round(ownGoals.reduce((sum, goal) => sum + goal.progress, 0) / ownGoals.length)
        : 0
    }
  })
  const activeTasks = memberTasks.filter((task) => !task.archivedAt)
  return {
    team,
    teams: availableTeams,
    members: enriched,
    goals: teamGoals,
    tasks: memberTasks.filter((task) => !task.archivedAt),
    metrics: {
      tasks: activeTasks.length,
      done: activeTasks.filter((task) => task.status === 'done').length,
      goalProgress: teamGoals.length
        ? Math.round(teamGoals.reduce((sum, goal) => sum + goal.progress, 0) / teamGoals.length)
        : 0
    }
  }
})
