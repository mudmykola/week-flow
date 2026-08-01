<script setup lang="ts">
import { addDays, addMonths, endOfISOWeek, endOfMonth, format, isSameMonth, startOfISOWeek, startOfMonth, subMonths } from 'date-fns'
import { uk } from 'date-fns/locale'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
import { priorityColors } from '~/domain/services/taskLabels'

const tasks = ref<Task[]>([])
const loading = ref(true)
const cursor = ref(startOfMonth(new Date()))
onMounted(async () => { try { tasks.value = (await fetchAllTasks()).filter(task => task.dueDate && !task.archivedAt) } finally { loading.value = false } })
const title = computed(() => format(cursor.value, 'LLLL yyyy', { locale: uk }))
const dates = computed(() => {
  const start = startOfISOWeek(startOfMonth(cursor.value))
  const end = endOfISOWeek(endOfMonth(cursor.value))
  const result: Date[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) result.push(date)
  return result
})
const tasksByDate = computed(() => Object.groupBy(tasks.value, task => task.dueDate!))
const today = format(new Date(), 'yyyy-MM-dd')
</script>

<template>
  <div class="app-container">
    <PageHeader title="Календар" description="Дедлайни й навантаження у місячному ритмі." icon="i-lucide-calendar-days">
      <template #actions><div class="flex items-center gap-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1"><button class="rounded-lg p-2 text-secondary hover:bg-[var(--color-bg-alt)]" aria-label="Попередній місяць" @click="cursor = subMonths(cursor, 1)"><UIcon name="i-lucide-chevron-left" /></button><button class="min-w-36 rounded-lg px-3 py-2 text-sm font-semibold capitalize" @click="cursor = startOfMonth(new Date())">{{ title }}</button><button class="rounded-lg p-2 text-secondary hover:bg-[var(--color-bg-alt)]" aria-label="Наступний місяць" @click="cursor = addMonths(cursor, 1)"><UIcon name="i-lucide-chevron-right" /></button></div></template>
    </PageHeader>
    <USkeleton v-if="loading" class="h-[42rem] rounded-2xl" />
    <section v-else class="surface-card overflow-hidden">
      <div class="grid grid-cols-7 border-b border-[var(--color-panel-border)] bg-[var(--color-bg-alt)] text-center text-xs font-semibold uppercase tracking-wide text-secondary"><div v-for="day in ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']" :key="day" class="py-3">{{ day }}</div></div>
      <div class="grid grid-cols-7">
        <div v-for="date in dates" :key="date.toISOString()" class="min-h-28 border-b border-r border-[var(--color-panel-border)] p-2 sm:min-h-36 sm:p-3" :class="!isSameMonth(date, cursor) ? 'bg-[var(--color-bg-alt)] opacity-55' : ''">
          <div class="mb-2 flex items-center justify-between"><span class="grid size-7 place-items-center rounded-full text-xs font-semibold" :class="format(date,'yyyy-MM-dd') === today ? 'bg-[var(--color-accent)] text-white' : ''">{{ format(date, 'd') }}</span><span v-if="tasksByDate[format(date,'yyyy-MM-dd')]?.length" class="text-[10px] text-secondary">{{ tasksByDate[format(date,'yyyy-MM-dd')]?.length }}</span></div>
          <div class="space-y-1"><NuxtLink v-for="task in (tasksByDate[format(date,'yyyy-MM-dd')] || []).slice(0, 3)" :key="task.id" :to="`/?week=${task.week}`" class="flex items-center gap-1.5 rounded-md bg-[var(--color-bg-alt)] px-2 py-1 text-[11px] sm:text-xs"><span class="size-1.5 shrink-0 rounded-full" :style="{ background: priorityColors[task.priority] }" /><span class="truncate">{{ task.title }}</span></NuxtLink><p v-if="(tasksByDate[format(date,'yyyy-MM-dd')]?.length || 0) > 3" class="px-2 text-[10px] text-secondary">+{{ tasksByDate[format(date,'yyyy-MM-dd')]!.length - 3 }} ще</p></div>
        </div>
      </div>
    </section>
  </div>
</template>
