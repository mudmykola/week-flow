import { eq, inArray } from 'drizzle-orm'
import { useDb } from '../db'
import {
  activityLogs,
  automationExecutions,
  automationRules,
  comments,
  dailyReviews,
  focusSessions,
  goals,
  inboxItems,
  invitations,
  projectMembers,
  projects,
  reminderDeliveries,
  savedViews,
  stickyNotes,
  subtasks,
  tasks,
  teamMembers,
  teams,
  userSettings,
  users,
  workflowStages
} from '../db/schema'
import { requireAppUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const format = getQuery(event).format === 'csv' ? 'csv' : 'json'
  const db = useDb(event)
  const [account] = await db.select().from(users).where(eq(users.id, user.id))
  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, user.id))
  const userTasks = await db.select().from(tasks).where(eq(tasks.ownerId, user.id))
  const projectIds = userProjects.map((item) => item.id)
  const taskIds = userTasks.map((item) => item.id)

  const [taskSubtasks, taskComments, stages, rules, memberships, projectInvitations] = await Promise.all([
    taskIds.length ? db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds)) : [],
    taskIds.length ? db.select().from(comments).where(inArray(comments.taskId, taskIds)) : [],
    projectIds.length ? db.select().from(workflowStages).where(inArray(workflowStages.projectId, projectIds)) : [],
    projectIds.length ? db.select().from(automationRules).where(inArray(automationRules.projectId, projectIds)) : [],
    projectIds.length ? db.select().from(projectMembers).where(inArray(projectMembers.projectId, projectIds)) : [],
    projectIds.length ? db.select().from(invitations).where(inArray(invitations.projectId, projectIds)) : []
  ])
  const [
    executions,
    reviews,
    reminders,
    focus,
    views,
    inbox,
    notes,
    settings,
    managedTeams,
    teamMemberships,
    createdGoals,
    activity
  ] = await Promise.all([
    db.select().from(automationExecutions).where(eq(automationExecutions.ownerId, user.id)),
    db.select().from(dailyReviews).where(eq(dailyReviews.ownerId, user.id)),
    db.select().from(reminderDeliveries).where(eq(reminderDeliveries.ownerId, user.id)),
    db.select().from(focusSessions).where(eq(focusSessions.ownerId, user.id)),
    db.select().from(savedViews).where(eq(savedViews.ownerId, user.id)),
    db.select().from(inboxItems).where(eq(inboxItems.ownerId, user.id)),
    db.select().from(stickyNotes).where(eq(stickyNotes.ownerId, user.id)),
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)),
    db.select().from(teams).where(eq(teams.managerId, user.id)),
    db.select().from(teamMembers).where(eq(teamMembers.userId, user.id)),
    db.select().from(goals).where(eq(goals.createdBy, user.id)),
    db.select().from(activityLogs).where(eq(activityLogs.ownerId, user.id))
  ])

  if (format === 'json') {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      account,
      projects: userProjects,
      tasks: userTasks,
      subtasks: taskSubtasks,
      comments: taskComments,
      workflowStages: stages,
      automationRules: rules,
      automationExecutions: executions,
      projectMembers: memberships,
      invitations: projectInvitations,
      dailyReviews: reviews,
      reminderDeliveries: reminders,
      focusSessions: focus,
      savedViews: views,
      inboxItems: inbox,
      stickyNotes: notes,
      settings,
      teams: managedTeams,
      teamMemberships,
      goals: createdGoals,
      activityLogs: activity
    }
  }

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="weekflow-tasks.csv"')
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [
    'title,status,priority,dueDate,week,tags',
    ...userTasks.map((task) =>
      [task.title, task.status, task.priority, task.dueDate, task.week, task.tags.join('|')].map(escape).join(',')
    )
  ].join('\n')
})
