<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
const tasks = ref<Task[]>([])
onMounted(async () => { tasks.value = (await fetchAllTasks()).filter(task => task.dueDate && !task.archivedAt).sort((a,b)=>(a.dueDate!).localeCompare(b.dueDate!)) })
</script>
<template><div class="mx-auto max-w-5xl px-5 py-8 md:px-10"><h1 class="font-display mb-8 flex items-center gap-3 text-3xl"><UIcon name="i-lucide-gantt-chart" class="text-[var(--color-accent)]" />Таймлайн</h1><div class="relative ml-3 border-l border-[var(--color-panel-border)] pl-7"><article v-for="task in tasks" :key="task.id" class="relative mb-5 glass-card p-4"><span class="absolute -left-[2.15rem] top-5 size-3 rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-bg-alt)]"/><p class="text-xs text-secondary">{{ task.dueDate }}</p><h2 class="mt-1 font-medium">{{ task.title }}</h2><div class="mt-2 flex gap-2"><span v-for="tag in task.tags" :key="tag" class="text-xs text-secondary">#{{ tag }}</span></div></article></div></div></template>
