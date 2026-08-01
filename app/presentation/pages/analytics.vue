<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
const tasks = ref<Task[]>([])
onMounted(async () => { tasks.value = await fetchAllTasks() })
const active = computed(() => tasks.value.filter(task => !task.archivedAt))
const done = computed(() => active.value.filter(task => task.status === 'done').length)
const overdue = computed(() => active.value.filter(task => task.dueDate && task.dueDate < new Date().toISOString().slice(0,10) && task.status !== 'done').length)
const completion = computed(() => active.value.length ? Math.round(done.value / active.value.length * 100) : 0)
const byPriority = computed(() => ['urgent','high','medium','low'].map(priority => ({ priority, count: active.value.filter(task => task.priority === priority).length })))
</script>
<template><div class="mx-auto max-w-6xl px-5 py-8 md:px-10"><h1 class="font-display mb-8 flex items-center gap-3 text-3xl"><UIcon name="i-lucide-chart-no-axes-combined" class="text-[var(--color-accent)]" />Аналітика</h1><div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div v-for="metric in [{label:'Усього',value:active.length,icon:'i-lucide-list-checks'},{label:'Виконано',value:done,icon:'i-lucide-circle-check-big'},{label:'Прострочено',value:overdue,icon:'i-lucide-triangle-alert'},{label:'Прогрес',value:`${completion}%`,icon:'i-lucide-trending-up'}]" :key="metric.label" class="glass-panel p-5"><UIcon :name="metric.icon" class="mb-5 size-5 text-[var(--color-accent)]"/><p class="text-3xl font-display">{{ metric.value }}</p><p class="mt-1 text-sm text-secondary">{{ metric.label }}</p></div></div><section class="glass-panel mt-5 p-6"><h2 class="font-display mb-5 text-xl">Навантаження за пріоритетом</h2><div class="space-y-4"><div v-for="item in byPriority" :key="item.priority"><div class="mb-1 flex justify-between text-sm"><span class="capitalize">{{ item.priority }}</span><span>{{ item.count }}</span></div><div class="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08]"><div class="h-full rounded-full bg-[var(--color-accent)]" :style="{width:`${active.length ? item.count/active.length*100 : 0}%`}"/></div></div></div></section></div></template>
