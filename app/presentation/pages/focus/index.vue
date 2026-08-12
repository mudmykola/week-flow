<script setup lang="ts">
import { fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'
import type { GlobalCreateAction } from '~/domain/entities/globalCreate'
import type { Subtask, Task } from '~/domain/entities/task'
import { focusStats, type FocusKind, type FocusSession } from '~/domain/services/focus'

const tasks = ref<Task[]>([])
const sessions = ref<FocusSession[]>([])
const loading = ref(true)
const error = ref('')
const selectedId = useLocalStorage('weekflow-focus-task', '')
const queueIds = useLocalStorage<string[]>('weekflow-focus-queue', [])
const dailyGoal = useLocalStorage('weekflow-focus-daily-goal', 120)
const kind = ref<FocusKind>('focus')
const durationMinutes = ref(25)
const customMinutes = ref(25)
const note = ref('')
const result = ref('')
const immersive = ref(false)
const subtasks = ref<Subtask[]>([])
const timer = useFocusTimer()
const globalCreateBus = useEventBus<GlobalCreateAction>('weekflow:open-create')

const available = computed(() => tasks.value.filter((task) => !task.archivedAt && task.status !== 'done'))
const queue = computed(
  () => queueIds.value.map((id) => available.value.find((task) => task.id === id)).filter(Boolean) as Task[]
)
const selected = computed(
  () => available.value.find((task) => task.id === selectedId.value) ?? queue.value[0] ?? available.value[0]
)
const stats = computed(() => focusStats(sessions.value))

await load()
useLiveRefresh('tasks', load)
useIntervalFn(() => void loadSessions(), 30_000, { immediate: false })
watch(() => selected.value?.id, loadDetails, { immediate: true })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [taskRows, focus] = await Promise.all([fetchAllTasks(), $fetch<{ sessions: FocusSession[] }>('/api/focus')])
    tasks.value = taskRows
    sessions.value = focus.sessions
    if (!queueIds.value.length)
      queueIds.value = taskRows
        .filter((task) => !task.archivedAt && task.status !== 'done')
        .sort(
          (a, b) =>
            ['urgent', 'high', 'medium', 'low'].indexOf(a.priority) -
            ['urgent', 'high', 'medium', 'low'].indexOf(b.priority)
        )
        .slice(0, 8)
        .map((task) => task.id)
  } catch {
    error.value = 'load'
  } finally {
    loading.value = false
  }
}
async function loadSessions() {
  const response = await $fetch<{ sessions: FocusSession[] }>('/api/focus')
  sessions.value = response.sessions
}
async function loadDetails() {
  if (!selected.value) return (subtasks.value = [])
  const details = await $fetch<{ subtasks: Subtask[] }>(`/api/tasks/${selected.value.id}/details`).catch(() => null)
  subtasks.value = details?.subtasks ?? []
}
function selectTask(id: string) {
  selectedId.value = id
}
function moveQueue(id: string, direction: -1 | 1) {
  const index = queueIds.value.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= queueIds.value.length) return
  const next = [...queueIds.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  queueIds.value = next
}
function removeQueue(id: string) {
  queueIds.value = queueIds.value.filter((item) => item !== id)
}
function addSelectedToQueue() {
  if (selected.value && !queueIds.value.includes(selected.value.id)) queueIds.value.push(selected.value.id)
}
function chooseMode(value: FocusKind, minutes: number) {
  kind.value = value
  durationMinutes.value = minutes
  customMinutes.value = minutes
}
async function startSession() {
  const minutes = Math.max(1, Math.min(240, customMinutes.value || durationMinutes.value))
  const task = kind.value === 'focus' ? selected.value : null
  if (import.meta.client && Notification.permission === 'default') void Notification.requestPermission()
  const session = await $fetch<FocusSession>('/api/focus', {
    method: 'POST',
    body: { taskId: task?.id ?? null, kind: kind.value, plannedSeconds: minutes * 60, note: note.value || null }
  })
  timer.start({
    sessionId: session.id,
    taskId: task?.id ?? null,
    taskTitle: task?.title ?? '',
    kind: kind.value,
    duration: minutes * 60
  })
  sessions.value.unshift(session)
}
function toggle() {
  timer.state.value.running ? timer.pause() : timer.active.value ? timer.resume() : void startSession()
}
async function finish(status: 'completed' | 'interrupted') {
  await timer.finish(status, note.value, result.value)
  await loadSessions()
}
async function completeTask() {
  if (!selected.value) return
  await updateTask(selected.value.id, { status: 'done' })
  tasks.value = tasks.value.filter((item) => item.id !== selected.value!.id)
  removeQueue(selected.value.id)
}
async function toggleSubtask(item: Subtask) {
  item.done = !item.done
  item.status = item.done ? 'done' : 'todo'
  await $fetch(`/api/subtasks/${item.id}`, { method: 'PATCH', body: { done: item.done, status: item.status } })
}
onKeyStroke(' ', (event) => {
  if ((event.target as HTMLElement)?.matches('input,textarea,select')) return
  event.preventDefault()
  toggle()
})
onKeyStroke('r', (event) => {
  if (!(event.target as HTMLElement)?.matches('input,textarea')) timer.reset()
})
onKeyStroke('Escape', () => (immersive.value = false))
</script>

<template>
  <div
    class="focus-page app-container max-w-7xl"
    :class="{
      'focus-page--immersive fixed inset-0 z-50 max-w-none overflow-y-auto bg-[var(--color-bg)] p-4 sm:p-8': immersive
    }"
  >
    <PageHeader
      :title="$t('nav.focus')"
      :description="$t('pages.focus.description')"
      icon="i-lucide-timer"
    >
      <template #actions
        ><IconButton
          :icon="immersive ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          :label="$t('pages.focus.immersive')"
          @click="immersive = !immersive"
      /></template>
    </PageHeader>
    <div
      v-if="loading"
      class="skeleton h-96 rounded-2xl"
    />
    <EmptyState
      v-else-if="!selected"
      :title="$t('pages.focus.empty')"
      :description="$t('pages.focus.emptyHint')"
      icon="i-lucide-party-popper"
      ><AppButton
        icon="i-lucide-plus"
        @click="globalCreateBus.emit('task')"
        >{{ $t('pages.focus.createTask') }}</AppButton
      ></EmptyState
    >
    <section
      v-else-if="error"
      class="surface-card p-8 text-center"
    >
      <p>{{ $t('pages.focus.loadError') }}</p>
      <AppButton
        class="mt-3"
        @click="load"
        >{{ $t('common.tryAgain') }}</AppButton
      >
    </section>
    <div
      v-else
      class="focus-page__workspace grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_19rem]"
    >
      <div class="space-y-4">
        <FocusQueue
          :tasks="queue"
          :selected-id="selected.id"
          @select="selectTask"
          @move="moveQueue"
          @remove="removeQueue"
        />
        <FormSelect v-model="selectedId"
          ><option
            v-for="task in available"
            :key="task.id"
            :value="task.id"
          >
            {{ task.title }}
          </option></FormSelect
        >
        <AppButton
          class="w-full"
          variant="secondary"
          icon="i-lucide-list-plus"
          @click="addSelectedToQueue"
          >{{ $t('pages.focus.addQueue') }}</AppButton
        >
      </div>
      <main class="focus-page__main surface-card flex min-h-[35rem] flex-col items-center p-5">
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="mode in [
              { key: 'focus', min: 25 },
              { key: 'short_break', min: 5 },
              { key: 'long_break', min: 15 }
            ]"
            :key="mode.key"
            class="count-badge"
            :class="kind === mode.key ? 'text-[var(--color-accent)]' : ''"
            @click="chooseMode(mode.key as FocusKind, mode.min)"
          >
            {{ $t(`pages.focus.mode.${mode.key}`) }}
          </button>
        </div>
        <h2 class="font-display mt-5 max-w-2xl text-center text-2xl">
          {{ kind === 'focus' ? selected.title : $t('pages.focus.break') }}
        </h2>
        <div class="mt-3 flex items-center gap-2">
          <FormInput
            v-model="customMinutes"
            type="number"
            size="sm"
            class="w-24"
            min="1"
            max="240"
          /><span class="text-secondary text-xs">{{ $t('pages.focus.minutes') }}</span>
        </div>
        <div
          v-if="kind === 'focus'"
          class="mt-2 flex gap-1"
        >
          <button
            v-for="minutes in [15, 25, 45, 60]"
            :key="minutes"
            type="button"
            class="count-badge"
            :class="customMinutes === minutes ? 'text-[var(--color-accent)]' : ''"
            @click="customMinutes = minutes"
          >
            {{ minutes }}
          </button>
        </div>
        <FocusTimer
          class="my-auto"
          :display="timer.display.value"
          :progress="timer.progress.value"
          :running="timer.state.value.running"
          @toggle="toggle"
          @reset="timer.reset"
          @stop="finish('interrupted')"
        />
        <div class="grid w-full gap-2 sm:grid-cols-2">
          <FormTextarea
            v-model="note"
            rows="2"
            :placeholder="$t('pages.focus.sessionNote')"
          /><FormTextarea
            v-model="result"
            rows="2"
            :placeholder="$t('pages.focus.sessionResult')"
          />
        </div>
        <div class="mt-3 flex flex-wrap justify-center gap-2">
          <AppButton
            variant="secondary"
            icon="i-lucide-check"
            @click="finish('completed')"
            >{{ $t('pages.focus.completeSession') }}</AppButton
          ><AppButton
            variant="ghost"
            icon="i-lucide-external-link"
            @click="navigateTo({ path: '/', query: { task: selected.id } })"
            >{{ $t('pages.focus.openTask') }}</AppButton
          ><AppButton
            variant="ghost"
            icon="i-lucide-circle-check-big"
            @click="completeTask"
            >{{ $t('pages.focus.completeTask') }}</AppButton
          >
        </div>
      </main>
      <div class="space-y-4">
        <FocusStats
          :minutes="stats.minutesToday"
          :completed="stats.completedToday"
          :streak="stats.streak"
          :goal="dailyGoal"
          :week="stats.week"
          @update:goal="dailyGoal = Math.max(15, Math.min(600, $event))"
        />
        <section class="surface-card p-3">
          <h2 class="mb-2 text-sm font-semibold">{{ $t('task.subtasks') }}</h2>
          <BoundedTaskList
            :count="subtasks.length"
            :preview="6"
            :row-height="40"
            storage-key="focus-subtasks"
          >
            <div>
              <label
                v-for="item in subtasks"
                :key="item.id"
                class="flex gap-2 py-2 text-sm"
                ><input
                  type="checkbox"
                  class="ui-checkbox"
                  :checked="item.done"
                  @change="toggleSubtask(item)"
                /><span :class="item.done ? 'text-secondary line-through' : ''">{{ item.title }}</span></label
              >
            </div>
          </BoundedTaskList>
          <p
            v-if="!subtasks.length"
            class="text-secondary text-xs"
          >
            {{ $t('pages.focus.noSubtasks') }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
