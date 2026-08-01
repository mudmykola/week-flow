<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import { getCurrentWeek } from '~/domain/services/week'
import type { Task } from '~/domain/entities/task'
const tasks = ref<Task[]>([])
const notes = useLocalStorage('weekflow-weekly-review', '')
onMounted(async()=>{ tasks.value=(await fetchAllTasks()).filter(task=>task.week===getCurrentWeek()) })
const done=computed(()=>tasks.value.filter(task=>task.status==='done'))
const remaining=computed(()=>tasks.value.filter(task=>task.status!=='done'))
</script>
<template><div class="mx-auto max-w-5xl px-5 py-8 md:px-10"><h1 class="font-display mb-2 flex items-center gap-3 text-3xl"><UIcon name="i-lucide-sparkles" class="text-[var(--color-accent)]"/>Огляд тижня</h1><p class="mb-8 text-secondary">Підсумуйте результат і визначте наступний фокус.</p><div class="grid gap-5 md:grid-cols-2"><section class="glass-panel p-6"><h2 class="font-display mb-4">Завершено · {{ done.length }}</h2><p v-for="task in done" :key="task.id" class="mb-2 flex gap-2 text-sm"><UIcon name="i-lucide-check" class="mt-0.5 text-[var(--color-accent)]"/>{{ task.title }}</p></section><section class="glass-panel p-6"><h2 class="font-display mb-4">Залишилось · {{ remaining.length }}</h2><p v-for="task in remaining" :key="task.id" class="mb-2 flex gap-2 text-sm"><UIcon name="i-lucide-arrow-right" class="mt-0.5 text-secondary"/>{{ task.title }}</p></section></div><section class="glass-panel mt-5 p-6"><h2 class="font-display mb-3">Нотатки та фокус</h2><textarea v-model="notes" rows="7" class="w-full resize-none rounded-xl border border-[var(--color-panel-border)] bg-transparent p-4 outline-none" placeholder="Що спрацювало? Що покращити наступного тижня?"/></section></div></template>
