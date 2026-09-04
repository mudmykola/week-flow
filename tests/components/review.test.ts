import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workspace = readFileSync(resolve(process.cwd(), 'app/presentation/components/review/ReviewWorkspace.vue'), 'utf8')
const page = readFileSync(resolve(process.cwd(), 'app/presentation/pages/review/index.vue'), 'utf8')
const taskTimeline = readFileSync(
  resolve(process.cwd(), 'app/presentation/components/review/ReviewTaskTimeline.vue'),
  'utf8'
)
const taskCard = readFileSync(
  resolve(process.cwd(), 'app/presentation/components/review/ReviewTaskJournalCard.vue'),
  'utf8'
)
const entryComposer = readFileSync(
  resolve(process.cwd(), 'app/presentation/components/review/ReviewEntryComposer.vue'),
  'utf8'
)
const standupSummary = readFileSync(
  resolve(process.cwd(), 'app/presentation/components/review/ReviewStandupSummary.vue'),
  'utf8'
)

describe('Review 2.0 workspace contract', () => {
  it('keeps day and week modes while using date navigation for history and team as context', () => {
    expect(page).toContain('<ReviewWorkspace')
    for (const tab of ['daily', 'weekly']) expect(workspace).toContain(`'${tab}'`)
    expect(workspace).not.toContain("type Tab = 'daily' | 'weekly' | 'history'")
    expect(workspace).toContain('selectMember')
    expect(workspace).toContain('icon="i-lucide-calendar-days"')
    expect(workspace).toContain('input.showPicker()')
    expect(workspace).toContain('class="review-toolbar__date-picker"')
  })

  it('uses actual review data, persisted autosave, standup copy and keyboard date navigation', () => {
    expect(workspace).toContain('fetchDailyReview')
    expect(workspace).toContain('saveDailyReview')
    expect(workspace).toContain('generateDailyReflection')
    expect(workspace).toContain('generateStandup')
    expect(workspace).toContain("onKeyStroke('ArrowLeft'")
    expect(workspace).toContain('navigator.clipboard.writeText')
  })

  it('supports task and subtask progress journaling with edit and delete actions', () => {
    expect(workspace).toContain('<ReviewTaskTimeline')
    expect(workspace).not.toContain('<ReviewTimeline')
    expect(workspace).toContain('<ReviewDecisionQueue')
    expect(workspace).not.toContain('<ReviewDailyBrief')
    expect(workspace).toContain('<ReviewStandupSummary')
    expect(workspace).toContain('<ReviewReflectionEditor')
    expect(workspace).toContain('<ReviewHistoryCalendar')
    expect(workspace).toContain('<ReviewStandupPanel')
    expect(workspace).toContain('createReviewProgress')
    expect(entryComposer).toContain('subtaskId')
    expect(taskCard).toContain("emit('update'")
    expect(taskCard).toContain("emit('delete'")
    expect(taskCard).toContain('journal.focusMinutes')
    expect(taskCard).toContain('journal.historyEntries')
    expect(taskTimeline).toContain('addableTasks')
  })

  it('protects active drafts and keeps weekly review tied to the selected date', () => {
    expect(workspace).toContain('dirty.value')
    expect(workspace).toContain('saveRevision')
    expect(workspace).toContain('load(true)')
    expect(workspace).toContain('selectedWeek')
    expect(workspace).toContain('dateToWeek(parseISO(selectedDate.value))')
    expect(workspace).not.toContain('getCurrentWeek()')
  })

  it('persists structured reflection and applies task decisions through the existing task API', () => {
    expect(workspace).toContain('structuredContent: { standup: finalStandup.value, reflection: reflection.value }')
    expect(workspace).toContain('resolveDecision')
    expect(workspace).toContain('updateTask(task.id')
  })

  it('keeps the first screen focused and moves supporting tools to URL-addressable panels', () => {
    expect(workspace).toContain("type ReviewPanel = 'journal' | 'reflection' | 'history' | null")
    expect(workspace).toContain('panel: activePanel.value || undefined')
    expect(workspace).toContain("openPanel('journal')")
    expect(workspace).toContain("activePanel === 'reflection'")
    expect(workspace).toContain("activePanel === 'history'")
    expect(workspace).toContain('size="fullscreen"')
    expect(standupSummary).toContain('props.data.completed')
    expect(standupSummary).toContain('props.data.planned')
    expect(standupSummary).toContain('props.data.blockers')
    expect(standupSummary).toContain('.slice(0, 5)')
    expect(standupSummary).toContain("emit('open'")
  })
})
