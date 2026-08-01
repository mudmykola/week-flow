<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
const tasks = ref<Task[]>([])
onMounted(async () => { tasks.value = (await fetchAllTasks()).filter(task => task.dueDate && !task.archivedAt) })
const days = computed(() => Object.entries(Object.groupBy(tasks.value, task => task.dueDate!)).sort(([a], [b]) => a.localeCompare(b)))
</script>
<template><div class="mx-auto max-w-6xl px-5 py-8 md:px-10"><h1 class="font-display mb-8 flex items-center gap-3 text-3xl"><UIcon name="i-lucide-calendar-days" class="text-[var(--color-accent)]" />Календар</h1><div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><section v-for="[date, dateTasks] in days" :key="date" class="glass-panel p-5"><h2 class="mb-4 font-display">{{ date }}</h2><div class="space-y-2"><div v-for="task in dateTasks" :key="task.id" class="glass-card p-3 text-sm"><p>{{ task.title }}</p><span class="text-xs text-secondary">{{ task.priority }}</span></div></div></section></div></div></template>
