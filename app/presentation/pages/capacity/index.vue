<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { fetchBacklogTasks, fetchTasks, updateTask } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task } from '~/domain/entities/task'
import { backlogTasks, buildCapacityDays, buildCapacityPlan } from '~/domain/services/planning'
import { dateToWeek } from '~/domain/services/week'
import { localDateKey } from '~/domain/services/today'

const route = useRoute()
const { week, label, isCurrentWeek, next, prev, goToCurrent } = useWeek()
const projectsStore = useProjectsStore()
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const error = ref(false)
const balancing = ref(false)
const capacityMinutes = useLocalStorage<number>('weekflow-capacity-workday-minutes', 480)
const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const today = localDateKey()

if (typeof route.query.week === 'string') week.value = route.query.week

const days = computed(() => buildCapacityDays(tasks.value, week.value, Number(capacityMinutes.value)))
const backlog = computed(() => backlogTasks(tasks.value))
const plannedMinutes = computed(() => days.value.reduce((sum, day) => sum + day.plannedMinutes, 0))
const totalCapacity = computed(() => days.value.reduce((sum, day) => sum + day.capacityMinutes, 0))
const utilization = computed(() =>
  totalCapacity.value ? Math.round((plannedMinutes.value / totalCapacity.value) * 100) : 0
)
const missingEstimate = computed(
  () =>
    days.value.reduce((sum, day) => sum + day.unknownEstimates, 0) +
    backlog.value.filter((task) => !task.estimateMinutes).length
)
const proposedPlan = computed(() =>
  buildCapacityPlan(backlog.value, days.value, isCurrentWeek.value ? today : days.value[0]?.date || today)
)

onMounted(load)
useLiveRefresh('tasks', load)
watch(week, (value) => {
  void navigateTo({ query: { ...route.query, week: isCurrentWeek.value ? undefined : value } }, { replace: true })
  void load()
})

async function load() {
  loading.value = true
  error.value = false
  try {
    const [weekTasks, backlogItems, people] = await Promise.all([
      fetchTasks(week.value),
      fetchBacklogTasks(),
      $fetch<AssignableUser[]>('/api/users/assignable').catch(() => [])
    ])
    tasks.value = [...new Map([...weekTasks, ...backlogItems].map((task) => [task.id, task])).values()]
    assignees.value = people
    if (!projectsStore.projects.length) await projectsStore.loadProjects()
    if (typeof route.query.task === 'string') {
      const task = tasks.value.find((item) => item.id === route.query.task)
      if (task) openTask(task, false)
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function dayLabel(date: string) {
  return format(parseISO(date), 'EEE, d MMM', { locale: uk })
}

async function autoBalance() {
  if (!proposedPlan.value.length || balancing.value) return
  balancing.value = true
  try {
    const updated = await Promise.all(
      proposedPlan.value.map(({ taskId, plannedDate }) =>
        updateTask(taskId, { plannedDate, week: dateToWeek(parseISO(plannedDate)) })
      )
    )
    const byId = new Map(updated.map((task) => [task.id, task]))
    tasks.value = tasks.value.map((task) => byId.get(task.id) ?? task)
    broadcastSync('tasks')
  } finally {
    balancing.value = false
  }
}

function openTask(task: Task, syncUrl = true) {
  editingTask.value = task
  editorOpen.value = true
  if (syncUrl) void navigateTo({ query: { ...route.query, task: task.id } }, { replace: true })
}

function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
  void navigateTo({ query: { ...route.query, task: undefined } }, { replace: true })
}

function syncTask(task: Task) {
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index !== -1) tasks.value[index] = task
}
</script>

<template>
  <main class="capacity-page app-container">
    <PageHeader
      :title="$t('pages.capacity.title')"
      :description="$t('pages.capacity.description')"
      icon="i-lucide-gauge"
    >
      <template #actions>
        <AppButton
          to="/backlog"
          variant="secondary"
          icon="i-lucide-list-filter"
          >{{ $t('pages.capacity.openBacklog') }}</AppButton
        >
      </template>
    </PageHeader>

    <section class="capacity-page__controls surface-card">
      <div class="capacity-page__week">
        <IconButton
          icon="i-lucide-chevron-left"
          :label="$t('common.previous')"
          @click="prev"
        />
        <div>
          <strong>{{ label }}</strong
          ><span>{{ week }}</span>
        </div>
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('common.next')"
          @click="next"
        />
        <AppButton
          v-if="!isCurrentWeek"
          size="sm"
          variant="ghost"
          @click="goToCurrent"
          >{{ $t('common.today') }}</AppButton
        >
      </div>
      <label class="capacity-page__limit">
        <span>{{ $t('pages.capacity.dailyLimit') }}</span>
        <FormSelect
          v-model="capacityMinutes"
          size="sm"
        >
          <option :value="360">6 {{ $t('pages.capacity.hours') }}</option>
          <option :value="420">7 {{ $t('pages.capacity.hours') }}</option>
          <option :value="480">8 {{ $t('pages.capacity.hours') }}</option>
          <option :value="540">9 {{ $t('pages.capacity.hours') }}</option>
        </FormSelect>
      </label>
      <AppButton
        icon="i-lucide-wand-sparkles"
        :loading="balancing"
        :disabled="!proposedPlan.length"
        @click="autoBalance"
        >{{ $t('pages.capacity.autoPlan', { count: proposedPlan.length }) }}</AppButton
      >
    </section>

    <section class="capacity-page__summary">
      <article>
        <span>{{ $t('pages.capacity.utilization') }}</span
        ><strong>{{ utilization }}%</strong><i><b :style="{ width: `${Math.min(100, utilization)}%` }" /></i>
      </article>
      <article>
        <span>{{ $t('pages.capacity.planned') }}</span
        ><strong>{{ plannedMinutes }} / {{ totalCapacity }} {{ $t('task.minuteShort') }}</strong>
      </article>
      <article>
        <span>{{ $t('pages.capacity.overloadedDays') }}</span
        ><strong>{{ days.filter((day) => day.overloaded).length }}</strong>
      </article>
      <article>
        <span>{{ $t('pages.capacity.missingEstimate') }}</span
        ><strong>{{ missingEstimate }}</strong>
      </article>
    </section>

    <div
      v-if="loading"
      class="capacity-page__loading"
    >
      <USkeleton
        v-for="index in 5"
        :key="index"
        class="h-64 rounded-xl"
      />
    </div>
    <EmptyState
      v-else-if="error"
      :title="$t('pages.capacity.loadError')"
      :description="$t('common.tryAgain')"
      icon="i-lucide-cloud-alert"
    >
      <AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton>
    </EmptyState>
    <section
      v-else
      class="capacity-page__days"
    >
      <article
        v-for="day in days"
        :key="day.date"
        class="capacity-day surface-card"
        :class="{ 'capacity-day--overloaded': day.overloaded }"
      >
        <header>
          <div>
            <strong>{{ dayLabel(day.date) }}</strong
            ><span>{{ day.tasks.length }} {{ $t('pages.capacity.tasks') }}</span>
          </div>
          <SemanticBadge
            v-if="day.overloaded"
            tone="danger"
            icon="i-lucide-triangle-alert"
            >{{ $t('pages.capacity.overload') }}</SemanticBadge
          >
          <SemanticBadge
            v-else-if="day.utilization >= 80"
            tone="warning"
            >{{ day.utilization }}%</SemanticBadge
          >
          <SemanticBadge
            v-else
            tone="success"
            >{{ day.utilization }}%</SemanticBadge
          >
        </header>
        <div class="capacity-day__progress"><i :style="{ width: `${Math.min(100, day.utilization)}%` }" /></div>
        <p>
          {{ day.plannedMinutes }} / {{ day.capacityMinutes }} {{ $t('task.minuteShort')
          }}<span v-if="day.unknownEstimates">
            · {{ $t('pages.capacity.unknown', { count: day.unknownEstimates }) }}</span
          >
        </p>
        <BoundedTaskList
          :count="day.tasks.length"
          :preview="3"
          :row-height="76"
          :storage-key="`capacity-${day.date}`"
        >
          <div class="capacity-day__tasks">
            <PlanningTaskRow
              v-for="task in day.tasks"
              :key="task.id"
              :task="task"
              :project="projectsStore.getProject(task.projectId)"
              @open="openTask"
            />
          </div>
        </BoundedTaskList>
        <div
          v-if="!day.tasks.length"
          class="capacity-day__empty"
        >
          <UIcon name="i-lucide-calendar-plus" />{{ $t('pages.capacity.freeDay') }}
        </div>
      </article>
    </section>

    <section
      v-if="!loading && backlog.length"
      class="capacity-page__backlog surface-card"
    >
      <div>
        <strong>{{ $t('pages.capacity.unscheduled', { count: backlog.length }) }}</strong>
        <span>{{ $t('pages.capacity.unscheduledHint') }}</span>
      </div>
      <AppButton
        to="/backlog"
        variant="secondary"
        icon="i-lucide-arrow-right"
        >{{ $t('pages.capacity.reviewBacklog') }}</AppButton
      >
    </section>

    <TaskEditor
      :open="editorOpen"
      :task="editingTask"
      :projects="projectsStore.projects"
      :assignees="assignees"
      initial-mode="view"
      @close="closeEditor"
      @updated="syncTask"
      @promoted="syncTask"
    />
  </main>
</template>

<style scoped>
.capacity-page__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
  padding: 0.65rem;
}
.capacity-page__week {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.55rem;
}
.capacity-page__week div {
  display: grid;
  min-width: 11rem;
  text-align: center;
}
.capacity-page__week span,
.capacity-page__limit span {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.capacity-page__limit {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.capacity-page__summary {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 0.8rem;
}
.capacity-page__summary article {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.85rem;
  background: var(--color-panel-bg);
}
.capacity-page__summary span {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.capacity-page__summary strong {
  font-size: 1rem;
}
.capacity-page__summary i,
.capacity-day__progress {
  height: 0.28rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-bg-alt);
}
.capacity-page__summary i b,
.capacity-day__progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-success);
}
.capacity-page__days,
.capacity-page__loading {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.7rem;
  padding-bottom: 0.35rem;
}
.capacity-day {
  min-width: 0;
  padding: 0.75rem;
}
.capacity-day--overloaded {
  border-color: color-mix(in srgb, var(--color-danger) 42%, var(--color-panel-border));
}
.capacity-day--overloaded .capacity-day__progress i {
  background: var(--color-danger);
}
.capacity-day > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}
.capacity-day > header div {
  display: grid;
  min-width: 0;
}
.capacity-day > header strong {
  overflow: hidden;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
}
.capacity-day > header span,
.capacity-day > p {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.capacity-day__progress {
  margin-top: 0.75rem;
}
.capacity-day > p {
  margin: 0.4rem 0 0.7rem;
}
.capacity-day__tasks {
  display: grid;
  gap: 0.45rem;
}
.capacity-day__empty {
  display: grid;
  min-height: 7.5rem;
  place-items: center;
  align-content: center;
  gap: 0.45rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-align: center;
}
.capacity-page__backlog {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.8rem;
  padding: 0.8rem;
}
.capacity-page__backlog div {
  display: grid;
  gap: 0.15rem;
}
.capacity-page__backlog span {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
}
@media (max-width: 900px) {
  .capacity-page__controls {
    align-items: stretch;
    flex-direction: column;
  }
  .capacity-page__limit {
    justify-content: space-between;
  }
  .capacity-page__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .capacity-page__days,
  .capacity-page__loading {
    grid-template-columns: minmax(16rem, 1fr);
    overflow: visible;
  }
}
@media (min-width: 901px) and (max-width: 1180px) {
  .capacity-page__days,
  .capacity-page__loading {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .capacity-page__summary {
    grid-template-columns: 1fr;
  }
  .capacity-page__week div {
    min-width: 0;
    flex: 1;
  }
  .capacity-page__backlog {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
