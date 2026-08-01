<script setup lang="ts">
import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { uk } from 'date-fns/locale'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
import { priorityColors, priorityLabels } from '~/domain/services/taskLabels'

const tasks = ref<Task[]>([])
const loading = ref(true)
const range = ref<14 | 30>(14)
const start = startOfDay(new Date())
onMounted(async () => {
  try {
    tasks.value = (await fetchAllTasks())
      .filter((task) => task.dueDate && !task.archivedAt && task.status !== 'done')
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  } finally {
    loading.value = false
  }
})
const days = computed(() => Array.from({ length: range.value }, (_, i) => addDays(start, i)))
const visible = computed(() =>
  tasks.value.filter((task) => {
    const offset = differenceInCalendarDays(new Date(`${task.dueDate}T12:00:00`), start)
    return offset >= 0 && offset < range.value
  })
)
function position(task: Task) {
  return Math.max(0, differenceInCalendarDays(new Date(`${task.dueDate}T12:00:00`), start))
}
</script>

<template>
  <div class="timeline-page app-container">
    <PageHeader
      :title="$t('nav.timeline')"
      :description="$t('pages.timeline.description')"
      icon="i-lucide-gantt-chart"
    >
      <template #actions
        ><div class="flex rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1">
          <button
            v-for="option in [14, 30] as const"
            :key="option"
            class="rounded-lg px-3 py-1.5 text-xs"
            :class="range === option ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' : 'text-secondary'"
            @click="range = option"
          >
            {{ $t('pages.timeline.days', { count: option }) }}
          </button>
        </div></template
      >
    </PageHeader>
    <USkeleton
      v-if="loading"
      class="h-[34rem] rounded-2xl"
    />
    <EmptyState
      v-else-if="!visible.length"
      :title="$t('pages.timeline.empty')"
      :description="$t('pages.timeline.emptyHint')"
      icon="i-lucide-calendar-plus"
    />
    <section
      v-else
      class="surface-card overflow-hidden"
    >
      <div class="app-scrollbar overflow-x-auto">
        <div
          class="min-w-[900px]"
          :style="{ width: `${Math.max(900, range * 72 + 260)}px` }"
        >
          <div
            class="grid border-b border-[var(--color-panel-border)] bg-[var(--color-bg-alt)]"
            :style="{ gridTemplateColumns: `260px repeat(${range}, minmax(0, 1fr))` }"
          >
            <div class="text-secondary p-3 text-xs font-semibold">{{ $t('task.title') }}</div>
            <div
              v-for="day in days"
              :key="day.toISOString()"
              class="border-l border-[var(--color-panel-border)] p-2 text-center"
            >
              <p class="text-secondary text-[10px] uppercase">{{ format(day, 'EEE', { locale: uk }) }}</p>
              <p class="text-xs font-semibold">{{ format(day, 'd') }}</p>
            </div>
          </div>
          <div
            v-for="task in visible"
            :key="task.id"
            class="grid min-h-14 border-b border-[var(--color-panel-border)] last:border-b-0"
            :style="{ gridTemplateColumns: `260px repeat(${range}, minmax(0, 1fr))` }"
          >
            <NuxtLink
              :to="`/?week=${task.week}`"
              class="flex min-w-0 items-center gap-2 px-4 text-sm font-medium"
              ><span
                class="size-2 rounded-full"
                :style="{ background: priorityColors[task.priority] }"
              /><span class="truncate">{{ task.title }}</span></NuxtLink
            >
            <div
              v-for="(_day, index) in days"
              :key="index"
              class="relative border-l border-[var(--color-panel-border)]"
            >
              <div
                v-if="index === position(task)"
                class="absolute inset-x-1 top-2 flex h-10 items-center rounded-lg px-2 text-xs font-semibold text-white"
                :style="{ background: priorityColors[task.priority] }"
                :title="`${priorityLabels[task.priority]} · ${task.dueDate}`"
              >
                <UIcon
                  name="i-lucide-flag"
                  class="mr-1 size-3"
                />{{ task.dueDate?.slice(5) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
