<script setup lang="ts">
import { addDays, format, parseISO, subDays } from 'date-fns'
import { enUS, uk } from 'date-fns/locale'
import { fetchAllTasks, moveWeekTasks } from '~/data/repositories/tasksRepository'
import {
  createReviewProgress,
  deleteReviewProgress,
  fetchDailyReview,
  fetchReviewHistory,
  saveDailyReview,
  updateReviewProgress
} from '~/data/repositories/reviewsRepository'
import type { DailyReviewData, ReviewTask, SavedDailyReview } from '~/domain/entities/review'
import type { Task } from '~/domain/entities/task'
import { generateDailyReflection, generateStandup } from '~/domain/services/dailyReview'
import { localDateKey, localDayRange } from '~/domain/services/today'
import { getCurrentWeek, getNextWeek } from '~/domain/services/week'

type Tab = 'daily' | 'weekly' | 'history'
type TeamMember = { id: string; name: string; avatarUrl: string | null; taskActive: number; taskOverdue: number }

const route = useRoute()
const { locale, t } = useI18n()
const { report } = useApiFeedback()
const today = localDateKey()
const selectedDate = ref(typeof route.query.date === 'string' ? route.query.date : today)
const tab = ref<Tab>(
  ['daily', 'weekly', 'history'].includes(String(route.query.tab)) ? (route.query.tab as Tab) : 'daily'
)
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
useLiveRefresh('tasks', load)
watch([selectedDate, selectedUser], () => {
  syncRoute()
  void load()
})
watch(tab, syncRoute)
watch(content, () => {
  if (!canEdit.value || loading.value) return
  clearTimeout(saveTimer)
  saving.value = 'saving'
  localStorage.setItem(`weekflow-review-draft-${selectedDate.value}`, content.value)
  saveTimer = setTimeout(() => void persist('draft'), 700)
})
onKeyStroke('ArrowLeft', (event) => keyboardDate(event, -1))
onKeyStroke('ArrowRight', (event) => keyboardDate(event, 1))
onKeyStroke('t', (event) => {
  if (!isTyping(event)) selectedDate.value = today
})
onKeyStroke('e', (event) => {
  if (!isTyping(event) && tab.value !== 'daily') tab.value = 'daily'
})
onBeforeUnmount(() => clearTimeout(saveTimer))

async function load() {
  loading.value = true
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
    content.value =
      stored.review?.content ||
      localStorage.getItem(`weekflow-review-draft-${selectedDate.value}`) ||
      generatedText(selected, prior)
    saving.value = stored.review ? 'saved' : 'idle'
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
async function loadWeekly() {
  weeklyTasks.value = (await fetchAllTasks()).filter((task) => task.week === getCurrentWeek() && !task.archivedAt)
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
function syncRoute() {
  void navigateTo(
    {
      query: {
        ...route.query,
        tab: tab.value === 'daily' ? undefined : tab.value,
        date: selectedDate.value === today ? undefined : selectedDate.value,
        user: selectedUser.value || undefined
      }
    },
    { replace: true }
  )
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
    saving.value = 'saving'
    saved.value = await saveDailyReview({
      reviewDate: selectedDate.value,
      content: content.value,
      structuredContent: { standup: standup.value },
      status
    })
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
  const result = await moveWeekTasks(getCurrentWeek(), getNextWeek(getCurrentWeek()))
  moved.value = true
  await loadWeekly()
  useToast().add({ title: t('pages.review.moved', { count: result.moved }), color: 'success' })
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
}
function selectMember(id: string | null) {
  selectedUser.value = id
  syncRoute()
}
</script>

<template>
  <div class="review-workspace app-container">
    <PageHeader
      :title="$t('pages.review.v2.title')"
      :description="$t('pages.review.v2.description')"
      icon="i-lucide-notebook-tabs"
    >
      <template #actions
        ><AppButton
          icon="i-lucide-copy"
          @click="copy(standup)"
          >{{ copied ? $t('pages.review.v2.copied') : $t('pages.review.v2.copyStandup') }}</AppButton
        ></template
      >
    </PageHeader>

    <nav
      class="review-tabs surface-card"
      :aria-label="$t('pages.review.v2.tabsLabel')"
    >
      <button
        v-for="item in ['daily', 'weekly', 'history'] as Tab[]"
        :key="item"
        :class="{ 'is-active': tab === item }"
        @click="tab = item"
      >
        <UIcon
          :name="item === 'daily' ? 'i-lucide-sun' : item === 'weekly' ? 'i-lucide-calendar-range' : 'i-lucide-history'"
        /><span>{{ $t(`pages.review.v2.tabs.${item}`) }}</span>
      </button>
    </nav>

    <template v-if="tab === 'daily'">
      <section class="review-datebar surface-card">
        <IconButton
          icon="i-lucide-chevron-left"
          :label="$t('pages.review.v2.previous')"
          @click="changeDate(-1)"
        />
        <div>
          <strong>{{ selectedLabel }}</strong
          ><small>{{ selectedUser ? daily?.user.name : $t('pages.review.v2.myStandup') }}</small>
        </div>
        <input
          v-model="selectedDate"
          type="date"
          :max="today"
          :aria-label="$t('pages.review.v2.selectDate')"
        />
        <AppButton
          size="sm"
          icon="i-lucide-locate-fixed"
          @click="selectedDate = today"
          >{{ $t('pages.review.v2.today') }}</AppButton
        >
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('pages.review.v2.next')"
          :disabled="selectedDate >= today"
          @click="changeDate(1)"
        />
        <FormSelect
          v-if="teamMembers.length"
          :model-value="selectedUser"
          class="review-member"
          @update:model-value="selectMember($event ?? null)"
          ><option :value="null">{{ $t('pages.review.v2.myStandup') }}</option>
          <option
            v-for="member in teamMembers"
            :key="member.id"
            :value="member.id"
          >
            {{ member.name }} · {{ member.taskActive }} / {{ member.taskOverdue }}
          </option></FormSelect
        >
      </section>
      <USkeleton
        v-if="loading"
        class="h-[38rem] rounded-2xl"
      />
      <EmptyState
        v-else-if="loadError"
        :title="$t('pages.review.v2.loadError')"
        :description="$t('pages.review.v2.loadErrorHint')"
        icon="i-lucide-triangle-alert"
        ><AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton></EmptyState
      >
      <template v-else-if="daily && reportData">
        <ReviewSummaryStrip
          :tasks="dailyTimelineTasks.length"
          :results="
            daily.completed.length +
            daily.completedSubtasks.length +
            daily.progressEntries.filter((item) => item.kind === 'result').length
          "
          :blockers="daily.blockers.length + daily.progressEntries.filter((item) => item.kind === 'blocker').length"
          :focus-minutes="daily.focusMinutes"
        />
        <section class="review-daily-layout">
          <ReviewTaskTimeline
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
          <ReviewStandupPanel
            :standup="standup"
            :content="content"
            :saving="saving"
            :copied="copied"
            :can-edit="canEdit"
            @copy="copy(standup)"
            @regenerate="resetReflection"
            @finish="persist('submitted')"
            @update:content="content = $event"
          />
        </section>
      </template>
    </template>

    <template v-else-if="tab === 'weekly'">
      <section class="review-metrics">
        <MetricCard
          :label="$t('pages.review.completed')"
          :value="weeklyDone.length"
          icon="i-lucide-circle-check-big"
          tone="success"
        /><MetricCard
          :label="$t('pages.review.remaining')"
          :value="weeklyRemaining.length"
          icon="i-lucide-list-todo"
          tone="warning"
        /><MetricCard
          :label="$t('pages.review.result')"
          :value="`${weeklyScore}%`"
          icon="i-lucide-trophy"
          tone="accent"
        />
      </section>
      <div class="review-weekly surface-card">
        <div>
          <h2>{{ $t('pages.review.v2.weekResults') }}</h2>
          <p>{{ $t('pages.review.v2.weekHint') }}</p>
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
      <AppSurface
        v-if="weeklyReflections.length"
        class="review-week-reflections"
      >
        <h2><UIcon name="i-lucide-notebook-text" />{{ $t('pages.review.v2.weekReflections') }}</h2>
        <div>
          <button
            v-for="item in weeklyReflections"
            :key="item.id"
            @click="showHistory(item)"
          >
            <strong>{{ format(parseISO(item.reviewDate), 'EEE, d MMM', { locale: dateLocale }) }}</strong
            ><span>{{ item.content.slice(0, 180) }}</span>
          </button>
        </div>
      </AppSurface>
    </template>

    <section
      v-else
      class="review-history surface-card"
    >
      <header>
        <div>
          <h2>{{ $t('pages.review.v2.historyTitle') }}</h2>
          <p>{{ $t('pages.review.v2.historyHint') }}</p>
        </div>
        <span>{{ history.length }}</span>
      </header>
      <button
        v-for="item in history"
        :key="item.id"
        @click="showHistory(item)"
      >
        <span
          ><strong>{{ format(parseISO(item.reviewDate), 'd MMMM yyyy', { locale: dateLocale }) }}</strong
          ><small>{{ item.content.slice(0, 120) }}</small></span
        ><em :class="`is-${item.status}`">{{ $t(`pages.review.v2.status.${item.status}`) }}</em
        ><UIcon name="i-lucide-chevron-right" />
      </button>
      <EmptyState
        v-if="!history.length"
        :title="$t('pages.review.v2.emptyHistory')"
        :description="$t('pages.review.v2.emptyHistoryHint')"
        icon="i-lucide-notebook"
      />
    </section>
  </div>
</template>

<style scoped>
.review-workspace {
  max-width: 1500px;
  margin-inline: auto;
  padding: 1rem;
}
.review-tabs,
.review-datebar,
.review-reflection__head,
.review-standup__head,
.review-weekly,
.review-history header {
  display: flex;
  align-items: center;
}
.review-tabs {
  gap: 0.25rem;
  padding: 0.3rem;
  margin-bottom: 0.65rem;
}
.review-tabs button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
}
.review-tabs button.is-active {
  background: var(--color-text-primary);
  color: var(--color-bg);
}
.review-datebar {
  justify-content: center;
  gap: 0.5rem;
  padding: 0.55rem;
  margin-bottom: 0.65rem;
}
.review-datebar > div {
  min-width: 17rem;
  text-align: center;
}
.review-datebar strong,
.review-datebar small {
  display: block;
  text-transform: capitalize;
}
.review-datebar small {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.review-datebar input {
  padding: 0.45rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.55rem;
  background: var(--color-panel-bg);
  font-size: 0.7rem;
}
.review-member {
  width: 13rem;
  margin-left: 0.25rem;
}
.review-daily-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 23rem);
  gap: 0.65rem;
  align-items: start;
  margin-bottom: 1rem;
}
.review-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  margin-bottom: 0.65rem;
}
.review-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.65rem;
}
.review-board--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.review-detail-grid {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 0.65rem;
  margin-bottom: 0.65rem;
}
.review-detail-grid h2,
.review-reflection h2 {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  font-weight: 800;
}
.review-detail-grid ul {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.65rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
.review-detail-grid pre {
  margin-top: 0.6rem;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 0.75rem;
  line-height: 1.6;
}
.review-standup__head,
.review-reflection__head,
.review-weekly,
.review-history header {
  justify-content: space-between;
  gap: 0.75rem;
}
.review-reflection {
  margin-bottom: 1rem;
}
.review-reflection__head {
  margin-bottom: 0.65rem;
}
.review-reflection__head > div:last-child {
  display: flex;
  gap: 0.35rem;
}
.review-reflection small {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.review-reflection small.is-error {
  color: var(--color-danger);
}
.review-weekly {
  padding: 0.75rem;
  margin-bottom: 0.65rem;
}
.review-weekly h2,
.review-history h2 {
  font-weight: 800;
}
.review-weekly p,
.review-history p {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
.review-history {
  padding: 0.75rem;
}
.review-week-reflections {
  margin-bottom: 0.65rem;
}
.review-week-reflections h2 {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
  font-weight: 800;
}
.review-week-reflections > div {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.4rem;
}
.review-week-reflections button {
  padding: 0.6rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
  text-align: left;
}
.review-week-reflections strong,
.review-week-reflections span {
  display: block;
}
.review-week-reflections span {
  display: -webkit-box;
  margin-top: 0.25rem;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.review-history header {
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--color-panel-border);
}
.review-history header > span {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--color-bg-alt);
  font-size: 0.7rem;
}
.review-history > button {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.7rem;
  border-bottom: 1px solid var(--color-panel-border);
  text-align: left;
}
.review-history > button:hover {
  background: var(--color-bg-alt);
}
.review-history strong,
.review-history small {
  display: block;
}
.review-history small {
  margin-top: 0.15rem;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.review-history em {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: var(--color-bg-alt);
  font-size: 0.62rem;
  font-style: normal;
}
.review-history em.is-submitted {
  color: #059669;
  background: rgb(16 185 129/0.1);
}
@media (max-width: 1000px) {
  .review-daily-layout {
    grid-template-columns: 1fr;
  }
  .review-daily-layout :deep(.review-standup-panel) {
    position: static;
  }
  .review-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .review-board {
    grid-template-columns: 1fr;
  }
  .review-detail-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .review-workspace {
    padding: 0.65rem;
  }
  .review-tabs button {
    flex: 1;
    justify-content: center;
  }
  .review-tabs button {
    padding-inline: 0.35rem;
    font-size: 0.66rem;
  }
  .review-datebar {
    flex-wrap: wrap;
  }
  .review-datebar > div {
    order: -1;
    width: 100%;
    min-width: 0;
  }
  .review-datebar input {
    flex: 1;
  }
  .review-member {
    width: 100%;
    margin-left: 0;
  }
  .review-metrics {
    gap: 0.35rem;
  }
  .review-reflection__head {
    align-items: flex-start;
    flex-direction: column;
  }
  .review-reflection__head > div:last-child {
    width: 100%;
  }
  .review-reflection__head .app-button {
    flex: 1;
  }
}
</style>
