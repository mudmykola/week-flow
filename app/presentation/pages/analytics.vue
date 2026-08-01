<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import { fetchProjects } from '~/data/repositories/projectsRepository'
import type { Task } from '~/domain/entities/task'
import type { Project } from '~/domain/entities/project'
import { getCurrentWeek, getPrevWeek } from '~/domain/services/week'
import { priorityColors, priorityLabels, statusLabels } from '~/domain/services/taskLabels'

const tasks = ref<Task[]>([])
const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref('')
const period = ref<'8w' | 'all'>('8w')
const today = new Date().toISOString().slice(0, 10)

onMounted(loadDashboard)

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    ;[tasks.value, projects.value] = await Promise.all([fetchAllTasks(), fetchProjects()])
  } catch {
    error.value = 'Не вдалося завантажити аналітику. Перевірте з’єднання та спробуйте ще раз.'
  } finally {
    loading.value = false
  }
}

const active = computed(() => tasks.value.filter(task => !task.archivedAt))
const currentWeek = getCurrentWeek()
const previousWeek = getPrevWeek(currentWeek)
const currentTasks = computed(() => active.value.filter(task => task.week === currentWeek))
const previousTasks = computed(() => active.value.filter(task => task.week === previousWeek))
const currentDone = computed(() => currentTasks.value.filter(task => task.status === 'done').length)
const previousDone = computed(() => previousTasks.value.filter(task => task.status === 'done').length)
const overdue = computed(() => active.value.filter(task => task.dueDate && task.dueDate < today && task.status !== 'done'))
const completion = computed(() => currentTasks.value.length ? Math.round(currentDone.value / currentTasks.value.length * 100) : 0)
const previousCompletion = computed(() => previousTasks.value.length ? Math.round(previousDone.value / previousTasks.value.length * 100) : 0)
const completionTrend = computed(() => completion.value - previousCompletion.value)
const trendLabel = computed(() => `${completionTrend.value > 0 ? '+' : completionTrend.value < 0 ? '−' : ''}${Math.abs(completionTrend.value)}%`)

const weeks = computed(() => {
  if (period.value === 'all') return [...new Set(active.value.map(task => task.week))].sort()
  const result: string[] = []
  let cursor = currentWeek
  for (let i = 0; i < 8; i++) { result.unshift(cursor); cursor = getPrevWeek(cursor) }
  return result
})
const trendData = computed(() => weeks.value.map(week => ({
  label: week.replace(/^\d{4}-W/, 'W'),
  done: active.value.filter(task => task.week === week && task.status === 'done').length,
  total: active.value.filter(task => task.week === week).length
})))
const statusItems = computed(() => [
  { label: statusLabels.todo, value: active.value.filter(task => task.status === 'todo').length, color: '#94a3b8' },
  { label: statusLabels.in_progress, value: active.value.filter(task => task.status === 'in_progress').length, color: '#3b82f6' },
  { label: statusLabels.done, value: active.value.filter(task => task.status === 'done').length, color: '#fe5011' }
])
const priorityItems = computed(() => (['urgent', 'high', 'medium', 'low'] as const).map(priority => ({ label: priorityLabels[priority], value: active.value.filter(task => task.priority === priority).length, color: priorityColors[priority] })))
const projectWorkload = computed(() => projects.value.map(project => ({ ...project, count: active.value.filter(task => task.projectId === project.id && task.status !== 'done').length })).filter(item => item.count).sort((a, b) => b.count - a.count).slice(0, 5))
const attention = computed(() => [...overdue.value, ...active.value.filter(task => task.priority === 'urgent' && task.status !== 'done' && !overdue.value.some(item => item.id === task.id))].slice(0, 6))
</script>

<template>
  <div class="app-container">
    <PageHeader title="Аналітика" description="Ритм роботи, навантаження та сигнали, які потребують уваги." icon="i-lucide-chart-no-axes-combined">
      <template #actions><USelect v-model="period" :items="[{ label: '8 тижнів', value: '8w' }, { label: 'Увесь час', value: 'all' }]" value-key="value" class="w-36" /></template>
    </PageHeader>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><USkeleton v-for="i in 4" :key="i" class="h-44 rounded-2xl" /></div>
    <EmptyState v-else-if="error" title="Аналітика недоступна" :description="error" icon="i-lucide-cloud-off"><UButton variant="soft" @click="loadDashboard">Спробувати ще раз</UButton></EmptyState>
    <template v-else>
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Задач цього тижня" :value="currentTasks.length" icon="i-lucide-list-checks" hint="Заплановано на поточний тиждень" />
        <MetricCard label="Виконано" :value="currentDone" icon="i-lucide-circle-check-big" tone="success" :trend="`${currentDone >= previousDone ? '+' : '−'}${Math.abs(currentDone - previousDone)}`" hint="Порівняно з минулим тижнем" />
        <MetricCard label="Прострочено" :value="overdue.length" icon="i-lucide-triangle-alert" tone="danger" hint="Активні задачі з минулим дедлайном" />
        <MetricCard label="Прогрес тижня" :value="`${completion}%`" icon="i-lucide-trending-up" :tone="completion >= 70 ? 'success' : 'accent'" :trend="trendLabel" hint="Completion rate" />
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,.75fr)]">
        <article class="section-card min-w-0"><div class="mb-5"><h2 class="font-display text-lg">Динаміка виконання</h2><p class="mt-1 text-sm text-secondary">Виконані та заплановані задачі за тижнями</p></div><TrendChart :data="trendData" /></article>
        <article class="section-card"><h2 class="font-display text-lg">Статуси</h2><p class="mt-1 text-sm text-secondary">Усі активні задачі</p><div class="mt-5"><DonutBreakdown :items="statusItems" /></div></article>
      </section>

      <section class="mt-4 grid gap-4 lg:grid-cols-2">
        <article class="section-card min-w-0"><h2 class="font-display text-lg">Пріоритети</h2><p class="mt-1 text-sm text-secondary">Де зараз зосереджене навантаження</p><BarBreakdown class="mt-6" :items="priorityItems" /></article>
        <article class="section-card">
          <h2 class="font-display text-lg">Активні проєкти</h2>
          <p class="mt-1 text-sm text-secondary">Невиконані задачі за проєктами</p>
          <div v-if="projectWorkload.length" class="mt-6 space-y-5">
            <div v-for="project in projectWorkload" :key="project.id">
              <div class="mb-2 flex items-center justify-between text-sm"><span class="flex items-center gap-2"><span class="size-2.5 rounded-full" :style="{ background: project.color }" />{{ project.name }}</span><strong>{{ project.count }}</strong></div>
              <div class="h-2 overflow-hidden rounded-full bg-[var(--color-bg-alt)]"><div class="h-full rounded-full" :style="{ width: `${project.count / Math.max(...projectWorkload.map(item => item.count), 1) * 100}%`, background: project.color }" /></div>
            </div>
          </div>
          <p v-else class="py-16 text-center text-sm text-secondary">Немає активних проєктів.</p>
        </article>
      </section>

      <section class="section-card mt-4"><div class="mb-4 flex items-center justify-between"><div><h2 class="font-display text-lg">Потребує уваги</h2><p class="mt-1 text-sm text-secondary">Прострочені та термінові задачі</p></div><NuxtLink to="/overdue" class="text-sm font-semibold text-[var(--color-accent)]">Переглянути всі</NuxtLink></div><div v-if="attention.length" class="divide-y divide-[var(--color-panel-border)]"><NuxtLink v-for="task in attention" :key="task.id" :to="`/?week=${task.week}`" class="flex items-center gap-3 py-3"><span class="size-2 rounded-full" :style="{ background: priorityColors[task.priority] }" /><span class="min-w-0 flex-1 truncate text-sm font-medium">{{ task.title }}</span><span class="text-xs text-secondary">{{ task.dueDate || priorityLabels[task.priority] }}</span><UIcon name="i-lucide-chevron-right" class="size-4 text-secondary" /></NuxtLink></div><p v-else class="py-8 text-center text-sm text-secondary">Усе під контролем — критичних задач немає.</p></section>
    </template>
  </div>
</template>
