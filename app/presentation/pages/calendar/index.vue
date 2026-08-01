<script setup lang="ts">
import {
  addDays,
  addMonths,
  endOfISOWeek,
  endOfMonth,
  format,
  isSameMonth,
  startOfISOWeek,
  startOfMonth,
  subMonths
} from 'date-fns'
import { enUS, uk } from 'date-fns/locale'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
import { priorityColors } from '~/domain/services/taskLabels'

const tasks = ref<Task[]>([])
const loading = ref(true)
const { locale, rt, tm } = useI18n()
const cursor = ref(startOfMonth(new Date()))
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')

taskCreatedBus.on((task) => {
  if (task.dueDate && !task.archivedAt) tasks.value.push(task)
})

onMounted(async () => {
  try {
    tasks.value = (await fetchAllTasks()).filter((task) => task.dueDate && !task.archivedAt)
  } finally {
    loading.value = false
  }
})
const title = computed(() => format(cursor.value, 'LLLL yyyy', { locale: locale.value === 'en' ? enUS : uk }))
const weekdays = computed(() =>
  (tm('pages.calendar.weekdays') as Array<Parameters<typeof rt>[0]>).map((day) => rt(day))
)
const dates = computed(() => {
  const start = startOfISOWeek(startOfMonth(cursor.value))
  const end = endOfISOWeek(endOfMonth(cursor.value))
  const result: Date[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) result.push(date)
  return result
})
const tasksByDate = computed(() => Object.groupBy(tasks.value, (task) => task.dueDate!))
const today = format(new Date(), 'yyyy-MM-dd')
</script>

<template>
  <div class="calendar-page app-container">
    <PageHeader
      :title="$t('nav.calendar')"
      :description="$t('pages.calendar.description')"
      icon="i-lucide-calendar-days"
    >
      <template #actions
        ><div
          class="flex items-center gap-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1"
        >
          <button
            class="text-secondary rounded-lg p-2 hover:bg-[var(--color-bg-alt)]"
            :aria-label="$t('pages.calendar.previous')"
            @click="cursor = subMonths(cursor, 1)"
          >
            <UIcon name="i-lucide-chevron-left" /></button
          ><button
            class="min-w-36 rounded-lg px-3 py-2 text-sm font-semibold capitalize"
            @click="cursor = startOfMonth(new Date())"
          >
            {{ title }}</button
          ><button
            class="text-secondary rounded-lg p-2 hover:bg-[var(--color-bg-alt)]"
            :aria-label="$t('pages.calendar.next')"
            @click="cursor = addMonths(cursor, 1)"
          >
            <UIcon name="i-lucide-chevron-right" />
          </button></div
      ></template>
    </PageHeader>
    <USkeleton
      v-if="loading"
      class="h-[42rem] rounded-2xl"
    />
    <section
      v-else
      class="surface-card overflow-hidden"
    >
      <div
        class="text-secondary grid grid-cols-7 border-b border-[var(--color-panel-border)] bg-[var(--color-bg-alt)] text-center text-xs font-semibold tracking-wide uppercase"
      >
        <div
          v-for="day in weekdays"
          :key="day"
          class="py-3"
        >
          {{ day }}
        </div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="date in dates"
          :key="date.toISOString()"
          class="min-h-28 border-r border-b border-[var(--color-panel-border)] p-2 sm:min-h-36 sm:p-3"
          :class="!isSameMonth(date, cursor) ? 'bg-[var(--color-bg-alt)] opacity-55' : ''"
        >
          <div class="mb-2 flex items-center justify-between">
            <span
              class="grid size-7 place-items-center rounded-full text-xs font-semibold"
              :class="format(date, 'yyyy-MM-dd') === today ? 'bg-[var(--color-accent)] text-white' : ''"
              >{{ format(date, 'd') }}</span
            ><span
              v-if="tasksByDate[format(date, 'yyyy-MM-dd')]?.length"
              class="text-secondary text-[10px]"
              >{{ tasksByDate[format(date, 'yyyy-MM-dd')]?.length }}</span
            >
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="task in (tasksByDate[format(date, 'yyyy-MM-dd')] || []).slice(0, 3)"
              :key="task.id"
              :to="`/?week=${task.week}`"
              class="flex items-center gap-1.5 rounded-md bg-[var(--color-bg-alt)] px-2 py-1 text-[11px] sm:text-xs"
              ><span
                class="size-1.5 shrink-0 rounded-full"
                :style="{ background: priorityColors[task.priority] }"
              /><span class="truncate">{{ task.title }}</span></NuxtLink
            >
            <p
              v-if="(tasksByDate[format(date, 'yyyy-MM-dd')]?.length || 0) > 3"
              class="text-secondary px-2 text-[10px]"
            >
              +{{ tasksByDate[format(date, 'yyyy-MM-dd')]!.length - 3 }} {{ $t('pages.calendar.more') }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
