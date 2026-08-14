import { z } from 'zod'

export const deleteAccountSchema = z.object({
  email: z.string().email(),
  acknowledgeDataLoss: z.literal(true)
})

export function accountDeletionStatements(userId: string) {
  const single = (sql: string) => ({ sql, values: [userId] })
  return [
    { sql: 'DELETE FROM activity_logs WHERE owner_id = ? OR actor_id = ?', values: [userId, userId] },
    single('DELETE FROM automation_executions WHERE owner_id = ?'),
    single('DELETE FROM reminder_deliveries WHERE owner_id = ?'),
    single('DELETE FROM comments WHERE author_id = ?'),
    { sql: 'DELETE FROM daily_reviews WHERE owner_id = ? OR user_id = ?', values: [userId, userId] },
    single('DELETE FROM focus_sessions WHERE owner_id = ?'),
    single('DELETE FROM saved_views WHERE owner_id = ?'),
    single('DELETE FROM inbox_items WHERE owner_id = ?'),
    single('DELETE FROM sticky_notes WHERE owner_id = ?'),
    single('DELETE FROM user_settings WHERE user_id = ?'),
    single('DELETE FROM goals WHERE created_by = ?'),
    single('DELETE FROM team_members WHERE user_id = ?'),
    single('DELETE FROM teams WHERE manager_id = ?'),
    single('DELETE FROM invitations WHERE invited_by = ?'),
    single('DELETE FROM project_members WHERE user_id = ?'),
    {
      sql: 'UPDATE tasks SET project_id = NULL WHERE owner_id <> ? AND project_id IN (SELECT id FROM projects WHERE owner_id = ?)',
      values: [userId, userId]
    },
    single('DELETE FROM tasks WHERE owner_id = ?'),
    single('DELETE FROM projects WHERE owner_id = ?'),
    single('DELETE FROM users WHERE id = ?')
  ]
}
