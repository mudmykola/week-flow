<script setup lang="ts">
import { addDays, format, parseISO, subDays } from 'date-fns'
import { enUS, uk } from 'date-fns/locale'
import { fetchAllTasks, moveWeekTasks, updateTask } from '~/data/repositories/tasksRepository'
import {
  createReviewProgress,
  deleteReviewProgress,
  fetchDailyReview,
  fetchReviewHistory,
  saveDailyReview,
  updateReviewProgress
} from '~/data/repositories/reviewsRepository'
import type { DailyReviewData, ReviewReflection, ReviewTask, SavedDailyReview } from '~/domain/entities/review'
import type { Task } from '~/domain/entities/task'
import { generateDailyReflection, generateStandup } from '~/domain/services/dailyReview'
import { localDateKey, localDayRange } from '~/domain/services/today'
import { dateToWeek, getNextWeek } from '~/domain/services/week'

type Tab = 'daily' | 'weekly'
type ReviewPanel = 'journal' | 'reflection' | 'history' | null
type TeamMember = { id: string; name: string; avatarUrl: string | null; taskActive: number; taskOverdue: number }

const route = useRoute()
const { locale, t } = useI18n()
const { report } = useApiFeedback()
const today = localDateKey()
const selectedDate = ref(typeof route.query.date === 'string' ? route.query.date : today)
const tab = ref<Tab>(['daily', 'weekly'].includes(String(route.query.tab)) ? (route.query.tab as Tab) : 'daily')
const activePanel = ref<ReviewPanel>(panelFromQuery(route.query.panel))
const datePicker = ref<HTMLInputElement | null>(null)
const daily = ref<DailyReviewData | null>(null)
const previous = ref<DailyReviewData | null>(null)
const saved = ref<SavedDailyReview | null>(null)
const history = ref<SavedDailyReview[]>([])
const weeklyTasks = ref<Task[]>([])
const teamMembers = ref<TeamMember[]>([])
const selectedUser = ref<string | null>(typeof route.query.user === 'string' ? route.query.user : null)
const content = ref('')
const loading = ref(true)
const loadError = ref(false)
const saving = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const copied = ref(false)
const moved = ref(false)
const progressSaving = ref(false)
const resolvingTask = ref<string | null>(null)
const dirty = ref(false)
const hydrating = ref(false)
const saveRevision = ref(0)
const reflection = ref<ReviewReflection>(emptyReflection())
let saveTimer: ReturnType<typeof setTimeout> | undefined

const dateLocale = computed(() => (locale.value === 'en' ? enUS : uk))
const selectedLabel = computed(() =>
  format(parseISO(selectedDate.value), 'EEEE, d MMMM yyyy', { locale: dateLocale.value })
)
const reflectionLabels = computed(() => ({
  results: t('pages.review.v2.results'),
  workedOn: t('pages.review.v2.workedOn'),
  unfinished: t('pages.review.v2.unfinished'),
  nextFocus: t('pages.review.v2.nextFocus'),
  blockers: t('pages.review.v2.blockers'),
  summary: t('pages.review.v2.summary'),
  subtask: t('pages.review.v2.subtask'),
  emptyResults: t('pages.review.v2.emptyResults'),
  emptyWorkedOn: t('pages.review.v2.emptyWorkedOn'),
  emptyUnfinished: t('pages.review.v2.emptyUnfinished'),
  emptyNextFocus: t('pages.review.v2.emptyNextFocus'),
  emptyBlockers: t('pages.review.v2.emptyBlockers'),
  summaryText: t('pages.review.v2.summaryText')
}))
const standupLabels = computed(() => ({
  yesterday: t('pages.review.v2.yesterday'),
  today: t('pages.review.v2.today'),
  blockers: t('pages.review.v2.blockers'),
  emptyYesterday: t('pages.review.v2.emptyResults'),
  emptyToday: t('pages.review.v2.emptyNextFocus'),
  emptyBlockers: t('pages.review.v2.emptyBlockers')
}))
const reportData = computed<DailyReviewData | null>(() => {
  if (!daily.value) return null
  return {
    ...daily.value,
    completed: previous.value?.completed || [],
    workedOn: previous.value?.workedOn || [],
    carriedOver: previous.value?.carriedOver || [],
    completedSubtasks: previous.value?.completedSubtasks || [],
    progressEntries: previous.value?.progressEntries || [],
    journals: previous.value?.journals || [],
    blockers: [
      ...new Map([...(previous.value?.blockers || []), ...daily.value.blockers].map((item) => [item.id, item])).values()
    ]
  }
})
const generatedReflection = computed(() =>
  reportData.value ? generateDailyReflection(reportData.value, reflectionLabels.value) : ''
)
const standup = computed(() => (reportData.value ? generateStandup(reportData.value, standupLabels.value) : ''))
const finalStandup = computed(() => structuredStandup(standup.value, reflection.value))
const selectedWeek = computed(() => dateToWeek(parseISO(selectedDate.value)))
const weeklyDone = computed(() => weeklyTasks.value.filter((task) => task.status === 'done'))
const weeklyRemaining = computed(() => weeklyTasks.value.filter((task) => task.status !== 'done'))
const weeklyScore = computed(() =>
  weeklyTasks.value.length ? Math.round((weeklyDone.value.length / weeklyTasks.value.length) * 100) : 0
)
const canEdit = computed(() => !selectedUser.value)
const weeklyReflections = computed(() => history.value.slice(0, 7).filter((item) => item.content.trim()))
const dailyTimelineTasks = computed(() => {
  if (!daily.value) return []
  return [
    ...new Map(
      [
        ...daily.value.journals.map((item) => item.task),
        ...daily.value.completed,
        ...daily.value.workedOn,
        ...daily.value.planned
      ].map((task) => [task.id, task])
    ).values()
  ]
})

onMounted(async () => {
  await Promise.all([load(), loadWeekly(), loadTeam()])
})
useLiveRefresh('tasks', () => load(true))
watch([selectedDate, selectedUser], () => {
  syncRoute()
  void load()
  void loadWeekly()
})
watch(tab, syncRoute)
watch(activePanel, syncRoute)
watch(
  () => route.query.panel,
  (value) => {
    const next = panelFromQuery(value)
    if (activePanel.value !== next) activePanel.value = next
  }
)
watch(
  [content, reflection],
  () => {
    if (!canEdit.value || loading.value || hydrating.value) return
    clearTimeout(saveTimer)
    dirty.value = true
    saving.value = 'saving'
    localStorage.setItem(
      `weekflow-review-draft-${selectedDate.value}`,
      JSON.stringify({ content: content.value, reflection: reflection.value })
    )
    saveTimer = setTimeout(() => void persist('draft'), 700)
  },
  { deep: true }
)
onKeyStroke('ArrowLeft', (event) => keyboardDate(event, -1))
onKeyStroke('ArrowRight', (event) => keyboardDate(event, 1))
onKeyStroke('t', (event) => {
  if (!isTyping(event)) selectedDate.value = today
})
onKeyStroke('e', (event) => {
  if (!isTyping(event) && tab.value !== 'daily') tab.value = 'daily'
})
onBeforeUnmount(() => clearTimeout(saveTimer))

async function load(preserveDraft = false) {
  if (!preserveDraft) loading.value = true
  loadError.value = false
  try {
    const previousDate = previousWorkday(selectedDate.value)
    const selectedRange = range(selectedDate.value)
    const previousRange = range(previousDate)
    const [selected, prior, stored] = await Promise.all([
      fetchDailyReview(selectedDate.value, selectedRange.start, selectedRange.end, selectedUser.value),
      fetchDailyReview(previousDate, previousRange.start, previousRange.end, selectedUser.value),
      selectedUser.value ? Promise.resolve({ review: null, history: [] }) : fetchReviewHistory(selectedDate.value)
    ])
    daily.value = selected
    previous.value = prior
    saved.value = stored.review
    history.value = stored.history
    if (!preserveDraft || !dirty.value) {
      hydrating.value = true
      const draft = readDraft(selectedDate.value)
      content.value = stored.review?.content || draft?.content || generatedText(selected, prior)
      reflection.value = savedReflection(stored.review) || draft?.reflection || emptyReflection()
      dirty.value = false
      await nextTick()
      hydrating.value = false
    }
    saving.value = stored.review ? 'saved' : 'idle'
  } catch {
    loadError.value = true
  } finally {
    if (!preserveDraft) loading.value = false
  }
}
async function loadWeekly() {
  weeklyTasks.value = (await fetchAllTasks()).filter((task) => task.week === selectedWeek.value && !task.archivedAt)
}
async function loadTeam() {
  try {
    const response = await $fetch<{ members: TeamMember[] }>('/api/team')
    teamMembers.value = response.members
  } catch {
    teamMembers.value = []
  }
}
function generatedText(selected: DailyReviewData, prior: DailyReviewData) {
  return generateDailyReflection(
    {
      ...selected,
      completed: prior.completed,
      workedOn: prior.workedOn,
      carriedOver: prior.carriedOver,
      completedSubtasks: prior.completedSubtasks,
      progressEntries: prior.progressEntries,
      journals: prior.journals
    },
    reflectionLabels.value
  )
}
function range(date: string) {
  return localDayRange(parseISO(`${date}T12:00:00`))
}
function previousWorkday(date: string) {
  let value = subDays(parseISO(date), 1)
  while (value.getDay() === 0 || value.getDay() === 6) value = subDays(value, 1)
  return format(value, 'yyyy-MM-dd')
}
function changeDate(amount: number) {
  const next = format(addDays(parseISO(selectedDate.value), amount), 'yyyy-MM-dd')
  if (next <= today) selectedDate.value = next
}
function openDatePicker() {
  const input = datePicker.value
  if (!input) return
  try {
    input.showPicker()
  } catch {
    input.focus()
    input.click()
  }
}
function syncRoute() {
  void navigateTo(
    {
      query: {
        ...route.query,
        tab: tab.value === 'daily' ? undefined : tab.value,
        view: undefined,
        panel: activePanel.value || undefined,
        date: selectedDate.value === today ? undefined : selectedDate.value,
        user: selectedUser.value || undefined
      }
    },
    { replace: true }
  )
}
function panelFromQuery(value: unknown): ReviewPanel {
  return ['journal', 'reflection', 'history'].includes(String(value)) ? (value as ReviewPanel) : null
}
function openPanel(panel: Exclude<ReviewPanel, null>) {
  activePanel.value = panel
}
function closePanel() {
  activePanel.value = null
}
function keyboardDate(event: KeyboardEvent, amount: number) {
  if (isTyping(event)) return
  event.preventDefault()
  changeDate(amount)
}
function isTyping(event: KeyboardEvent) {
  return (event.target as HTMLElement | null)?.matches('input, textarea, select, [contenteditable="true"]')
}
async function persist(status: 'draft' | 'submitted') {
  if (!canEdit.value) return
  try {
    const revision = ++saveRevision.value
    saving.value = 'saving'
    const result = await saveDailyReview({
      reviewDate: selectedDate.value,
      content: content.value,
      structuredContent: { standup: finalStandup.value, reflection: reflection.value },
      status
    })
    if (revision !== saveRevision.value) return
    saved.value = result
    dirty.value = false
    saving.value = 'saved'
    localStorage.removeItem(`weekflow-review-draft-${selectedDate.value}`)
    history.value = (await fetchReviewHistory()).history
  } catch {
    saving.value = 'error'
  }
}
function resetReflection() {
  content.value = generatedReflection.value
}
async function copy(value: string) {
  await navigator.clipboard.writeText(value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
function openTask(task: ReviewTask) {
  void navigateTo({ path: '/calendar', query: { task: task.id } })
}
async function carryOver() {
  const result = await moveWeekTasks(selectedWeek.value, getNextWeek(selectedWeek.value))
  moved.value = true
  await loadWeekly()
  useToast().add({ title: t('pages.review.moved', { count: result.moved }), color: 'success' })
}
async function resolveDecision(
  task: ReviewTask,
  action: 'tomorrow' | 'date' | 'unscheduled' | 'complete',
  date?: string
) {
  resolvingTask.value = task.id
  try {
    if (action === 'complete') await updateTask(task.id, { status: 'done' })
    else if (action === 'unscheduled') await updateTask(task.id, { plannedDate: null, plannedTime: null })
    else {
      const plannedDate = action === 'tomorrow' ? format(addDays(parseISO(selectedDate.value), 1), 'yyyy-MM-dd') : date
      if (!plannedDate) return
      await updateTask(task.id, { plannedDate, week: dateToWeek(parseISO(plannedDate)) })
    }
    await Promise.all([load(true), loadWeekly()])
    useToast().add({ title: t('pages.review.close.decisionSaved'), color: 'success' })
  } catch (error) {
    report(error, t('pages.review.close.decisionFailed'))
  } finally {
    resolvingTask.value = null
  }
}
function emptyReflection(): ReviewReflection {
  return { result: '', progress: '', blockers: '', decisions: '', nextFocus: '' }
}
function savedReflection(review: SavedDailyReview | null): ReviewReflection | null {
  const value = review?.structuredContent?.reflection
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(emptyReflection()).map((key) => [key, typeof source[key] === 'string' ? source[key] : ''])
  ) as ReviewReflection
}
function readDraft(date: string): { content: string; reflection: ReviewReflection } | null {
  try {
    const raw = localStorage.getItem(`weekflow-review-draft-${date}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { content?: unknown; reflection?: ReviewReflection }
    return {
      content: typeof parsed.content === 'string' ? parsed.content : '',
      reflection: parsed.reflection || emptyReflection()
    }
  } catch {
    return null
  }
}
function structuredStandup(base: string, value: ReviewReflection) {
  const details = [
    [t('pages.review.close.fields.result'), value.result],
    [t('pages.review.close.fields.progress'), value.progress],
    [t('pages.review.close.fields.decisions'), value.decisions],
    [t('pages.review.close.fields.nextFocus'), value.nextFocus],
    [t('pages.review.close.fields.blockers'), value.blockers]
  ].filter((entry) => entry[1]?.trim())
  return details.length ? `${base}\n\n${details.map(([label, text]) => `${label}: ${text}`).join('\n')}` : base
}
async function addProgress(input: Omit<Parameters<typeof createReviewProgress>[0], 'workDate'>) {
  progressSaving.value = true
  try {
    await createReviewProgress({ ...input, workDate: selectedDate.value })
    await load()
    useToast().add({ title: t('pages.review.progress.created'), color: 'success' })
  } catch (error) {
    report(error, t('pages.review.progress.saveFailed'))
  } finally {
    progressSaving.value = false
  }
}
async function editProgress(id: string, patch: Parameters<typeof updateReviewProgress>[1]) {
  progressSaving.value = true
  try {
    await updateReviewProgress(id, patch)
    await load()
  } catch (error) {
    report(error, t('pages.review.progress.saveFailed'))
  } finally {
    progressSaving.value = false
  }
}
async function removeProgress(id: string) {
  progressSaving.value = true
  try {
    await deleteReviewProgress(id)
    await load()
  } catch (error) {
    report(error, t('pages.review.progress.deleteFailed'))
  } finally {
    progressSaving.value = false
  }
}
function showHistory(item: SavedDailyReview) {
  selectedDate.value = item.reviewDate
  tab.value = 'daily'
  activePanel.value = null
}
function selectMember(id: string | null) {
  selectedUser.value = id
  syncRoute()
}
</script>

<template>
  <div class="review-workspace app-container">
    <header class="review-toolbar surface-card">
      <div class="review-toolbar__identity">
        <span><UIcon name="i-lucide-notebook-tabs" /></span>
        <div>
          <h1>{{ $t('pages.review.v2.title') }}</h1>
          <p>{{ $t('pages.review.v2.description') }}</p>
        </div>
      </div>
      <nav
        class="review-toolbar__tabs"
        :aria-label="$t('pages.review.v2.tabsLabel')"
      >
        <button
          v-for="item in ['daily', 'weekly'] as Tab[]"
          :key="item"
          :class="{ 'is-active': tab === item }"
          @click="tab = item"
        >
          <UIcon :name="item === 'daily' ? 'i-lucide-sun' : 'i-lucide-calendar-range'" />
          <span>{{ $t(`pages.review.v2.tabs.${item}`) }}</span>
        </button>
      </nav>
      <div class="review-toolbar__date">
        <IconButton
          icon="i-lucide-chevron-left"
          :label="$t('pages.review.v2.previous')"
          @click="changeDate(-1)"
        />
        <button
          type="button"
          class="review-toolbar__date-label"
          @click="selectedDate = today"
        >
          <strong>{{ selectedLabel }}</strong
          ><small>{{ selectedUser ? daily?.user.name : $t('pages.review.v2.myStandup') }}</small>
        </button>
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('pages.review.v2.next')"
          :disabled="selectedDate >= today"
          @click="changeDate(1)"
        />
        <div class="review-toolbar__date-picker">
          <IconButton
            icon="i-lucide-calendar-days"
            :label="$t('pages.review.v2.selectDate')"
            @click="openDatePicker"
          />
          <input
            ref="datePicker"
            v-model="selectedDate"
            type="date"
            :max="today"
            tabindex="-1"
            aria-hidden="true"
          />
        </div>
      </div>
      <FormSelect
        v-if="teamMembers.length"
        :model-value="selectedUser"
        class="review-toolbar__member"
        @update:model-value="selectMember($event ?? null)"
      >
        <option :value="null">{{ $t('pages.review.v2.myStandup') }}</option>
        <option
          v-for="member in teamMembers"
          :key="member.id"
          :value="member.id"
        >
          {{ member.name }}
        </option>
      </FormSelect>
      <details class="review-toolbar__more">
        <summary :aria-label="$t('pages.review.v2.moreActions')"><UIcon name="i-lucide-ellipsis" /></summary>
        <div>
          <button
            type="button"
            @click="openPanel('journal')"
          >
            <UIcon name="i-lucide-list-tree" />{{ $t('pages.review.final.dayJournal') }}
          </button>
          <button
            type="button"
            @click="openPanel('reflection')"
          >
            <UIcon name="i-lucide-notebook-pen" />{{ $t('pages.review.close.reflection') }}
          </button>
          <button
            type="button"
            @click="openPanel('history')"
          >
            <UIcon name="i-lucide-history" />{{ $t('pages.review.close.history') }}
          </button>
          <NuxtLink to="/analytics"><UIcon name="i-lucide-chart-no-axes-combined" />{{ $t('nav.analytics') }}</NuxtLink>
          <NuxtLink to="/activity"><UIcon name="i-lucide-activity" />{{ $t('nav.activity') }}</NuxtLink>
        </div>
      </details>
    </header>

    <template v-if="tab === 'daily'">
      <USkeleton
        v-if="loading"
        class="h-[30rem] rounded-2xl"
      />
      <EmptyState
        v-else-if="loadError"
        :title="$t('pages.review.v2.loadError')"
        :description="$t('pages.review.v2.loadErrorHint')"
        icon="i-lucide-triangle-alert"
        ><AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton></EmptyState
      >
      <template v-else-if="daily && reportData">
        <section class="review-daily-layout">
          <div class="review-daily-layout__main">
            <ReviewStandupSummary
              :data="reportData"
              @open="openTask"
            />
            <ReviewDecisionQueue
              :items="daily.attention"
              :resolving="resolvingTask"
              @resolve="resolveDecision"
              @open="openTask"
            />
            <nav
              class="review-detail-actions"
              :aria-label="$t('pages.review.v2.details')"
            >
              <button
                type="button"
                @click="openPanel('journal')"
              >
                <UIcon name="i-lucide-list-tree" /><span>{{ $t('pages.review.final.dayJournal') }}</span>
              </button>
              <button
                type="button"
                @click="openPanel('reflection')"
              >
                <UIcon name="i-lucide-notebook-pen" /><span>{{ $t('pages.review.close.reflection') }}</span>
              </button>
              <button
                v-if="!selectedUser"
                type="button"
                @click="openPanel('history')"
              >
                <UIcon name="i-lucide-history" /><span>{{ $t('pages.review.close.history') }}</span>
              </button>
            </nav>
          </div>
          <ReviewStandupPanel
            :standup="finalStandup"
            :content="content"
            :saving="saving"
            :copied="copied"
            :can-edit="canEdit"
            :completed="saved?.status === 'submitted'"
            @copy="copy(standup)"
            @regenerate="resetReflection"
            @finish="persist('submitted')"
            @reopen="persist('draft')"
            @update:content="content = $event"
          />
        </section>
      </template>
    </template>

    <template v-else-if="tab === 'weekly'">
      <div class="review-weekly surface-card">
        <div>
          <h2>{{ $t('pages.review.v2.weekResults') }}</h2>
          <p>{{ weeklyDone.length }} / {{ weeklyTasks.length }} · {{ weeklyScore }}%</p>
          <span><i :style="{ width: `${weeklyScore}%` }" /></span>
        </div>
        <AppButton
          v-if="weeklyRemaining.length && !moved"
          icon="i-lucide-forward"
          @click="carryOver"
          >{{ $t('pages.review.move') }}</AppButton
        >
      </div>
      <section class="review-board review-board--two">
        <ReviewTaskSection
          :title="$t('pages.review.completed')"
          icon="i-lucide-check-check"
          tone="success"
          :tasks="weeklyDone"
          :empty="$t('pages.review.noCompleted')"
          @open="openTask"
        /><ReviewTaskSection
          :title="$t('pages.review.remaining')"
          icon="i-lucide-arrow-right"
          tone="warning"
          :tasks="weeklyRemaining"
          :empty="$t('pages.review.fullyClosed')"
          @open="openTask"
        />
      </section>
      <AppButton
        v-if="!selectedUser"
        variant="ghost"
        icon="i-lucide-history"
        @click="openPanel('history')"
        >{{ $t('pages.review.close.history') }}</AppButton
      >
    </template>
  </div>

  <AppDrawer
    :open="activePanel === 'journal'"
    :title="$t('pages.review.final.dayJournal')"
    :eyebrow="selectedLabel"
    icon="i-lucide-list-tree"
    size="fullscreen"
    class="review-context-panel"
    @close="closePanel"
  >
    <ReviewTaskTimeline
      v-if="daily"
      :journals="daily.journals"
      :tasks="dailyTimelineTasks"
      :available-tasks="daily.availableTasks"
      :subtasks="daily.taskSubtasks"
      :can-edit="canEdit"
      :saving="progressSaving"
      @create="addProgress"
      @update="editProgress"
      @delete="removeProgress"
      @open="openTask"
    />
  </AppDrawer>
  <AppDrawer
    :open="activePanel === 'reflection'"
    :title="$t('pages.review.close.reflection')"
    :eyebrow="selectedLabel"
    icon="i-lucide-notebook-pen"
    size="wide"
    @close="closePanel"
  >
    <ReviewReflectionEditor
      v-model="reflection"
      :disabled="!canEdit || saved?.status === 'submitted'"
    />
  </AppDrawer>
  <AppDrawer
    :open="activePanel === 'history'"
    :title="$t('pages.review.close.history')"
    :eyebrow="$t('pages.review.close.historyHint')"
    icon="i-lucide-history"
    size="wide"
    @close="closePanel"
  >
    <ReviewHistoryCalendar
      v-if="!selectedUser"
      :selected-date="selectedDate"
      :history="history"
      :max-date="today"
      @select="selectedDate = $event"
    />
    <div
      v-if="weeklyReflections.length"
      class="review-history-list"
    >
      <button
        v-for="item in weeklyReflections"
        :key="item.id"
        type="button"
        @click="showHistory(item)"
      >
        <strong>{{ format(parseISO(item.reviewDate), 'EEE, d MMM', { locale: dateLocale }) }}</strong
        ><span>{{ item.content.slice(0, 180) }}</span>
      </button>
    </div>
  </AppDrawer>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-workspace.css"></style>
