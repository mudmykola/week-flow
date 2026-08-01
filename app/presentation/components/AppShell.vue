<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'

const route = useRoute()
const { user, clear } = useUserSession()
const colorMode = useColorMode()
const mobileOpen = ref(false)
const commandOpen = ref(false)
const online = useOnline()
const sidebarCollapsed = useLocalStorage('weekflow-sidebar-collapsed', false)
const query = ref('')
const allTasks = ref<Task[]>([])

const navigation = computed(() => [
  { label: 'Дошка', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Фокус', icon: 'i-lucide-timer', to: '/focus' },
  { label: 'Inbox', icon: 'i-lucide-inbox', to: '/inbox' },
  { label: 'Сьогодні', icon: 'i-lucide-sun', to: '/today' },
  { label: 'Майбутні', icon: 'i-lucide-clock-3', to: '/upcoming' },
  { label: 'Прострочені', icon: 'i-lucide-triangle-alert', to: '/overdue' },
  { label: 'Календар', icon: 'i-lucide-calendar-days', to: '/calendar' },
  { label: 'Таймлайн', icon: 'i-lucide-gantt-chart', to: '/timeline' },
  { label: 'Аналітика', icon: 'i-lucide-chart-no-axes-combined', to: '/analytics' },
  { label: 'Огляд тижня', icon: 'i-lucide-sparkles', to: '/review' },
  { label: 'Шаблони', icon: 'i-lucide-copy-plus', to: '/templates' },
  { label: 'Зв’язки', icon: 'i-lucide-network', to: '/links' },
  { label: 'Активність', icon: 'i-lucide-activity', to: '/activity' },
  { label: 'Архів', icon: 'i-lucide-archive', to: '/archive' },
  { label: 'Налаштування', icon: 'i-lucide-settings-2', to: '/settings' },
  ...(user.value?.role === 'admin' ? [{ label: 'Адмін', icon: 'i-lucide-shield-check', to: '/admin' }] : [])
])

const results = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return allTasks.value.slice(0, 8)
  return allTasks.value.filter(task => `${task.title} ${task.note ?? ''} ${(task.tags ?? []).join(' ')}`.toLowerCase().includes(term)).slice(0, 12)
})

async function openCommand() {
  commandOpen.value = true
  if (!allTasks.value.length) allTasks.value = await fetchAllTasks()
  await nextTick()
  document.querySelector<HTMLInputElement>('[data-command-input]')?.focus()
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
  <div class="min-h-screen bg-[var(--color-bg-alt)] text-[var(--color-text-primary)]">
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3 transition-[transform,width] lg:translate-x-0"
      :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', sidebarCollapsed ? 'lg:w-20' : 'lg:w-64']"
    >
      <div class="mb-7 flex items-center justify-between px-2 py-2">
        <NuxtLink to="/" class="flex items-center gap-3" @click="mobileOpen = false">
          <span class="grid size-9 place-items-center rounded-xl bg-[var(--color-accent)] text-white"><UIcon name="i-lucide-check-check" class="size-5" /></span>
          <span class="font-display text-xl" :class="sidebarCollapsed ? 'lg:hidden' : ''">WeekFlow</span>
        </NuxtLink>
        <button class="lg:hidden" aria-label="Закрити меню" @click="mobileOpen = false"><UIcon name="i-lucide-x" class="size-5" /></button>
      </div>

      <button class="mb-4 flex w-full items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-3 py-2.5 text-left text-sm text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.05]" @click="openCommand">
        <UIcon name="i-lucide-search" class="size-4" />
        <span class="flex-1" :class="sidebarCollapsed ? 'lg:hidden' : ''">Пошук</span><kbd class="text-xs" :class="sidebarCollapsed ? 'lg:hidden' : ''">⌘K</kbd>
      </button>

      <nav class="app-scrollbar flex max-h-[calc(100vh-13rem)] flex-col gap-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navigation" :key="item.to" :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary hover:bg-black/[0.04] hover:text-[var(--color-text-primary)] dark:hover:bg-white/[0.05]"
          :class="route.path === item.to ? 'bg-black/[0.06] text-[var(--color-text-primary)] dark:bg-white/[0.08]' : ''"
          :title="sidebarCollapsed ? item.label : undefined"
          @click="mobileOpen = false"
        >
          <UIcon :name="item.icon" class="size-4.5 shrink-0" /><span :class="sidebarCollapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <button class="absolute bottom-20 right-3 hidden size-7 place-items-center rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-secondary lg:grid" :title="sidebarCollapsed ? 'Розгорнути меню' : 'Згорнути меню'" @click="sidebarCollapsed = !sidebarCollapsed"><UIcon :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="size-4" /></button>
      <div class="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] p-3">
        <NuxtImg v-if="user?.avatarUrl" :src="user.avatarUrl" width="32" height="32" class="size-8 rounded-full" alt="" />
        <div class="min-w-0 flex-1" :class="sidebarCollapsed ? 'lg:hidden' : ''"><p class="truncate text-sm font-medium">{{ user?.name }}</p><p class="truncate text-xs text-secondary">{{ user?.email }}</p></div>
        <button title="Вийти" @click="logout"><UIcon name="i-lucide-log-out" class="size-4" /></button>
      </div>
    </aside>

    <div class="transition-[padding]" :class="sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'">
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--color-panel-border)] bg-[color:var(--color-bg-alt)]/90 px-4 backdrop-blur-xl md:px-8">
        <button class="lg:hidden" aria-label="Відкрити меню" @click="mobileOpen = true"><UIcon name="i-lucide-menu" class="size-5" /></button>
        <div class="flex-1" />
        <span v-if="!online" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-600"><UIcon name="i-lucide-wifi-off"/>Offline</span>
        <button class="rounded-lg p-2 text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" title="Змінити тему" @click="toggleTheme"><UIcon :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" class="size-5" /></button>
        <NuxtLink to="/?new=1" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-3.5 py-2 text-sm font-semibold text-white"><UIcon name="i-lucide-plus" class="size-4" /><span class="hidden sm:inline">Нова задача</span></NuxtLink>
      </header>
      <main><slot /></main>
    </div>

    <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="mobileOpen = false" />

    <div v-if="commandOpen" class="fixed inset-0 z-60 flex items-start justify-center bg-black/45 p-4 pt-[12vh]" @click.self="commandOpen = false">
      <div class="glass-panel w-full max-w-2xl overflow-hidden">
        <div class="flex items-center gap-3 border-b border-[var(--color-panel-border)] px-5"><UIcon name="i-lucide-search" class="size-5 text-secondary" /><input v-model="query" data-command-input class="h-14 flex-1 bg-transparent outline-none" placeholder="Знайти задачу…" @keyup.esc="commandOpen = false"></div>
        <div class="max-h-96 overflow-y-auto p-2">
          <NuxtLink v-for="task in results" :key="task.id" :to="`/?week=${task.week}`" class="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]" @click="commandOpen = false">
            <UIcon name="i-lucide-circle-check-big" class="size-4 text-secondary" /><span class="flex-1 truncate">{{ task.title }}</span><span class="text-xs text-secondary">{{ task.week }}</span>
          </NuxtLink>
          <p v-if="!results.length" class="p-6 text-center text-sm text-secondary">Нічого не знайдено</p>
        </div>
      </div>
    </div>
  </div>
</template>
