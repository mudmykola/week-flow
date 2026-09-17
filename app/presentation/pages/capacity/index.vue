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

<style scoped src="~/presentation/assets/css/pages/capacity.css"></style>
