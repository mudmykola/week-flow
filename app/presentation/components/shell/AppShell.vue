<script setup lang="ts">
import type { AssignableUser, Task, TaskPriority, TaskRecurrence } from '~/domain/entities/task'
import { createTask, fetchAllTasks, fetchTodayTasks } from '~/data/repositories/tasksRepository'
import { captureInboxItems, fetchInboxItems } from '~/data/repositories/inboxRepository'
import { createStickyNote } from '~/data/repositories/stickyNotesRepository'
import type { InboxItem } from '~/domain/entities/inbox'
import type { StickyNote } from '~/domain/entities/stickyNote'
import type { GlobalCreateAction } from '~/domain/entities/globalCreate'
import { isInboxTask } from '~/domain/services/inbox'
import {
  navigationForRole,
  navigationSections,
  taskBoardLink,
  type NavigationSection
} from '~/domain/services/navigation'
import { localDateKey, todayNavigationCount } from '~/domain/services/today'
import { getCurrentWeek } from '~/domain/services/week'

const { user, clear } = useUserSession()
const { t } = useI18n()
const { report } = useApiFeedback()
const colorMode = useColorMode()
const mobileOpen = ref(false)
const commandOpen = ref(false)
const online = useOnline()
const sidebarCollapsed = useLocalStorage('weekflow-sidebar-collapsed', false)
const query = ref('')
const allTasks = ref<Task[]>([])
const taskEditorOpen = ref(false)
const taskEditorLoading = ref(false)
const taskPlannedDate = ref<string | null>(null)
const quickCreateKind = ref<Exclude<GlobalCreateAction, 'task' | 'today'> | null>(null)
const quickCreateValue = ref('')
const quickCreateColor = ref('#fe5011')
const quickCreateSaving = ref(false)
const createFeedback = ref('')
const projectsStore = useProjectsStore()
const assignees = ref<AssignableUser[]>([])
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')
const stickyCreatedBus = useEventBus<StickyNote>('weekflow:sticky-created')
const globalCreateBus = useEventBus<GlobalCreateAction>('weekflow:open-create')
const tasksStore = useTasksStore()
const inboxItems = useState<InboxItem[]>('inbox-items', () => [])
const accountIsolation = useAccountIsolation()

const shortcutsOpen = ref(false)
const clock = useNow({ interval: 60_000 })
const today = computed(() => localDateKey(clock.value))

watch(
  () => user.value?.id,
  (id) => accountIsolation.bind(id),
  { immediate: true }
)

globalCreateBus.on(handleCreateAction)

onMounted(() => {
  fetchInboxItems()
    .then((items) => (inboxItems.value = items))
    .catch(() => {})
  tasksStore.loadListTasks(() => fetchTodayTasks(today.value)).catch(() => {})
})

useLiveRefresh('tasks', () => tasksStore.loadListTasks(() => fetchTodayTasks(today.value)).catch(() => {}))
watch(today, () => tasksStore.loadListTasks(() => fetchTodayTasks(today.value)).catch(() => {}))

const reusableTags = computed(() =>
  [...new Set(allTasks.value.flatMap((task) => task.tags ?? []))].sort((a, b) => a.localeCompare(b, 'uk'))
)

const navigation = computed(() =>
  navigationForRole(user.value?.role).map((item) => ({ ...item, label: t(item.label) }))
)

const groupedNavigation = computed(() =>
  navigationSections
    .map((section: NavigationSection) => ({
      section,
      items: navigation.value.filter((item) => item.section === section)
    }))
    .filter((group) => group.items.length)
)

const todayCount = computed(() => todayNavigationCount(tasksStore.listTasks, today.value))

const results = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return allTasks.value.slice(0, 8)
  return allTasks.value
    .filter((task) => `${task.title} ${task.note ?? ''} ${(task.tags ?? []).join(' ')}`.toLowerCase().includes(term))
    .slice(0, 12)
})

const navMatches = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return []
  return navigation.value.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 5)
})

async function openCommand() {
  commandOpen.value = true
  if (!allTasks.value.length) allTasks.value = await fetchAllTasks()
  await nextTick()
  document.querySelector<HTMLInputElement>('[data-command-input]')?.focus()
}

async function openTaskEditor(plannedDate: string | null = null) {
  taskPlannedDate.value = plannedDate
  taskEditorOpen.value = true
  if (projectsStore.projects.length && assignees.value.length && allTasks.value.length) return

  taskEditorLoading.value = true
  try {
    const [tasks, users] = await Promise.all([
      fetchAllTasks(),
      $fetch<AssignableUser[]>('/api/users/assignable'),
      projectsStore.projects.length ? Promise.resolve() : projectsStore.loadProjects()
    ])
    allTasks.value = tasks
    assignees.value = users
  } finally {
    taskEditorLoading.value = false
  }
}

async function saveTask(payload: {
  title: string
  note: string | null
  status: Task['status']
  projectId: string | null
  priority: TaskPriority
  dueDate: string | null
  plannedDate: string | null
  plannedTime: string | null
  estimateMinutes: number | null
  dayRank: number | null
  tags: string[]
  recurrence: TaskRecurrence | null
  assigneeId: string | null
  stageId: string | null
}) {
  const task = await createTask({ ...payload, week: getCurrentWeek(), sort: 0 })
  allTasks.value.push(task)
  if (isInboxTask(task)) tasksStore.inboxTasks.unshift(task)
  tasksStore.syncListTask(task)
  taskCreatedBus.emit(task)
  broadcastSync('tasks')
  taskEditorOpen.value = false
  showCreateFeedback(t('shell.created.task'))
}

function showCreateFeedback(message: string) {
  createFeedback.value = message
  window.setTimeout(() => {
    if (createFeedback.value === message) createFeedback.value = ''
  }, 2600)
}

function handleCreateAction(action: GlobalCreateAction) {
  if (action === 'task' || action === 'today') {
    void openTaskEditor(action === 'today' ? today.value : null)
    return
  }
  quickCreateKind.value = action
  quickCreateValue.value = ''
  quickCreateColor.value = '#fe5011'
}

async function submitQuickCreate() {
  const value = quickCreateValue.value.trim()
  if (!value || !quickCreateKind.value || quickCreateSaving.value) return
  quickCreateSaving.value = true
  try {
    if (quickCreateKind.value === 'inbox') {
      inboxItems.value.unshift(...(await captureInboxItems(value)))
    } else if (quickCreateKind.value === 'note') {
      stickyCreatedBus.emit(await createStickyNote({ content: value, color: 'yellow' }))
    } else {
      await projectsStore.addProject({ name: value, color: quickCreateColor.value })
    }
    showCreateFeedback(t(`shell.created.${quickCreateKind.value}`))
    quickCreateKind.value = null
  } catch (error) {
    report(error)
  } finally {
    quickCreateSaving.value = false
  }
}

async function addQueryToInbox() {
  const title = query.value.trim()
  if (!title) return
  inboxItems.value.unshift(...(await captureInboxItems(title)))
  query.value = ''
  commandOpen.value = false
}

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

async function logout() {
  accountIsolation.clear()
  await clear()
  await navigateTo('/login')
}

onKeyStroke('k', (event) => {
  if (!(event.metaKey || event.ctrlKey)) return
  event.preventDefault()
  openCommand()
})

onKeyStroke('n', (event) => {
  const target = event.target as HTMLElement | null
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    target?.matches('input, textarea, select, [contenteditable="true"]')
  )
    return
  event.preventDefault()
  void openTaskEditor()
})

useEventListener('keydown', (event) => {
  if (event.key !== '?') return
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  shortcutsOpen.value = true
})
</script>

<template>
  <div class="app-shell min-h-screen bg-[var(--color-bg-alt)] text-[var(--color-text-primary)]">
    <ShellSidebar
      v-model:mobile-open="mobileOpen"
      v-model:collapsed="sidebarCollapsed"
      :groups="groupedNavigation"
      :user="user"
      :inbox-count="inboxItems.length"
      :today-count="todayCount"
      @search="openCommand"
      @logout="logout"
    />

    <div
      class="transition-[padding]"
      :class="sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'"
    >
      <header
        class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--color-panel-border)] bg-[color:var(--color-bg-alt)]/90 px-3 backdrop-blur-xl md:px-5"
      >
        <button
          class="lg:hidden"
          :aria-label="$t('shell.openMenu')"
          @click="mobileOpen = true"
        >
          <UIcon
            name="i-lucide-menu"
            class="size-5"
          />
        </button>
        <div class="flex-1" />
        <span
          v-if="!online"
          class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-600"
          ><UIcon name="i-lucide-wifi-off" />Offline</span
        >
        <ShellSyncStatus />
        <button
          class="text-secondary rounded-lg p-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
          :title="$t('shell.changeTheme')"
          @click="toggleTheme"
        >
          <UIcon
            :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            class="size-5"
          />
        </button>
        <ShellReminders />
        <Transition name="fade">
          <span
            v-if="createFeedback"
            class="app-shell__create-feedback"
          >
            <UIcon name="i-lucide-circle-check" />{{ createFeedback }}
          </span>
        </Transition>
        <GlobalCreateMenu
          :loading="taskEditorLoading"
          @select="handleCreateAction"
        />
      </header>
      <main><slot /></main>
    </div>

    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="mobileOpen = false"
    />

    <TaskEditor
      :open="taskEditorOpen"
      :task="null"
      :default-planned-date="taskPlannedDate"
      :projects="projectsStore.projects"
      :assignees="assignees"
      :tag-options="reusableTags"
      @close="taskEditorOpen = false"
      @save="saveTask"
    />

    <Modal
      :open="Boolean(quickCreateKind)"
      :title="quickCreateKind ? $t(`shell.createActions.${quickCreateKind}.title`) : ''"
      size="sm"
      @close="quickCreateKind = null"
    >
      <form
        class="space-y-3"
        @submit.prevent="submitQuickCreate"
      >
        <FormField :label="$t('shell.quickCreateLabel')">
          <FormTextarea
            v-if="quickCreateKind === 'note'"
            v-model="quickCreateValue"
            autofocus
            :placeholder="$t(`shell.createActions.${quickCreateKind}.placeholder`)"
          />
          <FormInput
            v-else
            v-model="quickCreateValue"
            autofocus
            :placeholder="quickCreateKind ? $t(`shell.createActions.${quickCreateKind}.placeholder`) : ''"
          />
        </FormField>
        <FormField
          v-if="quickCreateKind === 'project'"
          :label="$t('projectEditor.color')"
        >
          <FormInput
            v-model="quickCreateColor"
            type="color"
          />
        </FormField>
      </form>
      <template #footer>
        <AppButton
          variant="ghost"
          @click="quickCreateKind = null"
          >{{ $t('common.cancel') }}</AppButton
        >
        <AppButton
          :loading="quickCreateSaving"
          variant="primary"
          @click="submitQuickCreate"
          >{{ $t('common.add') }}</AppButton
        >
      </template>
    </Modal>

    <FocusMiniPlayer />

    <div
      v-if="commandOpen"
      class="fixed inset-0 z-60 flex items-start justify-center bg-black/45 p-4 pt-[12vh]"
      @click.self="commandOpen = false"
    >
      <div class="glass-panel w-full max-w-2xl overflow-hidden">
        <div class="flex items-center gap-3 border-b border-[var(--color-panel-border)] px-5">
          <UIcon
            name="i-lucide-search"
            class="text-secondary size-5"
          /><input
            v-model="query"
            data-command-input
            class="h-14 flex-1 bg-transparent outline-none"
            :placeholder="$t('shell.findTask')"
            @keyup.esc="commandOpen = false"
            @keyup.enter="!results.length && addQueryToInbox()"
          />
        </div>
        <div class="max-h-96 overflow-y-auto p-2">
          <NuxtLink
            v-for="item in navMatches"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            @click="commandOpen = false"
          >
            <UIcon
              :name="item.icon"
              class="text-secondary size-4"
            /><span class="flex-1 truncate">{{ item.label }}</span
            ><span class="text-secondary text-xs">{{ $t('shell.goTo') }}</span>
          </NuxtLink>
          <NuxtLink
            v-for="task in results"
            :key="task.id"
            :to="taskBoardLink(task)"
            class="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            @click="commandOpen = false"
          >
            <UIcon
              name="i-lucide-circle-check-big"
              class="text-secondary size-4"
            /><span class="flex-1 truncate">{{ task.title }}</span
            ><span class="text-secondary text-xs">{{ task.week }}</span>
          </NuxtLink>
          <button
            v-if="!results.length && query.trim()"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            @click="addQueryToInbox"
          >
            <UIcon
              name="i-lucide-inbox"
              class="size-4 text-[var(--color-accent)]"
            /><span class="flex-1 truncate">{{ $t('shell.addToInbox', { query }) }}</span
            ><kbd class="text-xs">↵</kbd>
          </button>
          <p
            v-else-if="!results.length && !navMatches.length"
            class="text-secondary p-6 text-center text-sm"
          >
            {{ $t('shell.nothingFound') }}
          </p>
        </div>
      </div>
    </div>

    <Modal
      :open="shortcutsOpen"
      :title="$t('shell.shortcuts')"
      @close="shortcutsOpen = false"
    >
      <p class="text-secondary mb-3 text-sm">{{ $t('shell.shortcutsHint') }}</p>
      <div class="space-y-1.5 text-sm">
        <div class="flex items-center justify-between">
          <span>{{ $t('task.commandCreate') }}</span
          ><kbd class="text-xs">n</kbd>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('taskActions.complete') }} / {{ $t('common.edit') }}</span
          ><kbd class="text-xs">e</kbd>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('task.commandSearch') }}</span
          ><kbd class="text-xs">/</kbd>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('shell.findTask') }}</span
          ><kbd class="text-xs">↑ ↓ ← →</kbd>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('common.save') }}</span
          ><kbd class="text-xs">⌘/Ctrl + Enter</kbd>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('common.close') }}</span
          ><kbd class="text-xs">Esc</kbd>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('common.search') }}</span
          ><kbd class="text-xs">⌘/Ctrl + K</kbd>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.app-shell__create-feedback {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 13rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid rgb(16 185 129 / 0.2);
  border-radius: 999px;
  overflow: hidden;
  background: rgb(16 185 129 / 0.1);
  color: rgb(5 150 105);
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-0.2rem);
}
@media (max-width: 639px) {
  .app-shell__create-feedback {
    position: fixed;
    top: 4rem;
    right: 0.75rem;
    z-index: 55;
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.16);
  }
}
</style>
