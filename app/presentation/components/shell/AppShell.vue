<script setup lang="ts">
import type { AssignableUser, Task, TaskPriority, TaskRecurrence } from '~/domain/entities/task'
import { createTask, fetchAllTasks } from '~/data/repositories/tasksRepository'
import { navigationForRole } from '~/domain/services/navigation'
import { getCurrentWeek } from '~/domain/services/week'

const route = useRoute()
const { user, clear } = useUserSession()
const { t } = useI18n()
const colorMode = useColorMode()
const mobileOpen = ref(false)
const commandOpen = ref(false)
const online = useOnline()
const sidebarCollapsed = useLocalStorage('weekflow-sidebar-collapsed', false)
const query = ref('')
const allTasks = ref<Task[]>([])
const taskEditorOpen = ref(false)
const taskEditorLoading = ref(false)
const projectsStore = useProjectsStore()
const assignees = ref<AssignableUser[]>([])
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')

const reusableTags = computed(() =>
  [...new Set(allTasks.value.flatMap((task) => task.tags ?? []))].sort((a, b) => a.localeCompare(b, 'uk'))
)

const navigation = computed(() =>
  navigationForRole(user.value?.role).map((item) => ({ ...item, label: t(item.label) }))
)

const results = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return allTasks.value.slice(0, 8)
  return allTasks.value
    .filter((task) => `${task.title} ${task.note ?? ''} ${(task.tags ?? []).join(' ')}`.toLowerCase().includes(term))
    .slice(0, 12)
})

async function openCommand() {
  commandOpen.value = true
  if (!allTasks.value.length) allTasks.value = await fetchAllTasks()
  await nextTick()
  document.querySelector<HTMLInputElement>('[data-command-input]')?.focus()
}

async function openTaskEditor() {
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
  tags: string[]
  recurrence: TaskRecurrence | null
  assigneeId: string | null
  stageId: string | null
}) {
  const task = await createTask({ ...payload, week: getCurrentWeek(), sort: 0 })
  allTasks.value.push(task)
  taskCreatedBus.emit(task)
  taskEditorOpen.value = false
}

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

async function logout() {
  await clear()
  await navigateTo('/login')
}

onKeyStroke('k', (event) => {
  if (!(event.metaKey || event.ctrlKey)) return
  event.preventDefault()
  openCommand()
})
</script>

<template>
  <div class="app-shell min-h-screen bg-[var(--color-bg-alt)] text-[var(--color-text-primary)]">
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3 transition-[transform,width] lg:translate-x-0"
      :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', sidebarCollapsed ? 'lg:w-20' : 'lg:w-64']"
    >
      <div class="mb-5 flex shrink-0 items-center justify-between px-2 py-2">
        <NuxtLink
          to="/"
          class="flex items-center gap-3"
          @click="mobileOpen = false"
        >
          <span class="grid size-9 place-items-center rounded-xl bg-[var(--color-accent)] text-white"
            ><UIcon
              name="i-lucide-check-check"
              class="size-5"
          /></span>
          <span
            class="font-display text-xl"
            :class="sidebarCollapsed ? 'lg:hidden' : ''"
            >WeekFlow</span
          >
        </NuxtLink>
        <button
          class="lg:hidden"
          :aria-label="$t('shell.closeMenu')"
          @click="mobileOpen = false"
        >
          <UIcon
            name="i-lucide-x"
            class="size-5"
          />
        </button>
      </div>

      <button
        class="text-secondary mb-3 flex w-full shrink-0 items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-3 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        @click="openCommand"
      >
        <UIcon
          name="i-lucide-search"
          class="size-4"
        />
        <span
          class="flex-1"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
          >{{ $t('common.search') }}</span
        ><kbd
          class="text-xs"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
          >⌘K</kbd
        >
      </button>

      <nav class="app-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="text-secondary flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/[0.04] hover:text-[var(--color-text-primary)] dark:hover:bg-white/[0.05]"
          :class="route.path === item.to ? 'bg-black/[0.06] text-[var(--color-text-primary)] dark:bg-white/[0.08]' : ''"
          :title="sidebarCollapsed ? item.label : undefined"
          @click="mobileOpen = false"
        >
          <UIcon
            :name="item.icon"
            class="size-4.5 shrink-0"
          /><span :class="sidebarCollapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <button
        class="text-secondary mt-2 ml-auto hidden size-7 shrink-0 place-items-center rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] lg:grid"
        :title="sidebarCollapsed ? $t('shell.expandMenu') : $t('shell.collapseMenu')"
        @click="sidebarCollapsed = !sidebarCollapsed"
      >
        <UIcon
          :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          class="size-4"
        />
      </button>
      <div class="mt-2 flex shrink-0 items-center gap-3 rounded-xl border border-[var(--color-panel-border)] p-3">
        <NuxtImg
          v-if="user?.avatarUrl"
          :src="user.avatarUrl"
          width="32"
          height="32"
          class="size-8 rounded-full"
          alt=""
        />
        <div
          class="min-w-0 flex-1"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
        >
          <p class="truncate text-sm font-medium">{{ user?.name }}</p>
          <p class="text-secondary truncate text-xs">{{ user?.email }}</p>
        </div>
        <button
          :title="$t('shell.logout')"
          @click="logout"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          />
        </button>
      </div>
    </aside>

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
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-3.5 py-2 text-sm font-semibold text-white"
          :disabled="taskEditorLoading"
          @click="openTaskEditor"
        >
          <UIcon
            :name="taskEditorLoading ? 'i-lucide-loader-circle' : 'i-lucide-plus'"
            class="size-4"
            :class="taskEditorLoading ? 'animate-spin' : ''"
          /><span class="hidden sm:inline">{{ $t('shell.newTask') }}</span>
        </button>
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
      :projects="projectsStore.projects"
      :assignees="assignees"
      :tag-options="reusableTags"
      @close="taskEditorOpen = false"
      @save="saveTask"
    />

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
          />
        </div>
        <div class="max-h-96 overflow-y-auto p-2">
          <NuxtLink
            v-for="task in results"
            :key="task.id"
            :to="`/?week=${task.week}`"
            class="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            @click="commandOpen = false"
          >
            <UIcon
              name="i-lucide-circle-check-big"
              class="text-secondary size-4"
            /><span class="flex-1 truncate">{{ task.title }}</span
            ><span class="text-secondary text-xs">{{ task.week }}</span>
          </NuxtLink>
          <p
            v-if="!results.length"
            class="text-secondary p-6 text-center text-sm"
          >
            {{ $t('shell.nothingFound') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
