<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import { fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'

const props = defineProps<{ mode: 'today' | 'upcoming' | 'overdue' | 'archive'; title: string; icon: string }>()
const tasks = ref<Task[]>([])
const loading = ref(true)
const today = new Date().toISOString().slice(0, 10)

const visibleTasks = computed(() => tasks.value.filter((task) => {
  if (props.mode === 'archive') return Boolean(task.archivedAt)
  if (task.archivedAt) return false
  if (props.mode === 'today') return task.dueDate === today
  if (props.mode === 'upcoming') return Boolean(task.dueDate && task.dueDate > today)
  return Boolean(task.dueDate && task.dueDate < today && task.status !== 'done')
}).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')))

onMounted(async () => {
  try { tasks.value = await fetchAllTasks() } finally { loading.value = false }
})

async function toggleDone(task: Task) {
  const updated = await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
  Object.assign(task, updated)
}

async function toggleArchive(task: Task) {
  const updated = await updateTask(task.id, { archivedAt: task.archivedAt ? null : Date.now() })
  Object.assign(task, updated)
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 py-8 md:px-10">
    <header class="mb-8 flex items-center gap-3"><UIcon :name="icon" class="size-7 text-[var(--color-accent)]" /><h1 class="font-display text-3xl">{{ title }}</h1><span class="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs dark:bg-white/[0.08]">{{ visibleTasks.length }}</span></header>
    <div v-if="loading" class="space-y-3"><USkeleton v-for="i in 4" :key="i" class="h-20 w-full rounded-2xl" /></div>
    <div v-else-if="visibleTasks.length" class="space-y-3">
      <article v-for="task in visibleTasks" :key="task.id" class="glass-card flex items-center gap-4 p-4">
        <button :title="task.status === 'done' ? 'Повернути' : 'Виконати'" @click="toggleDone(task)"><UIcon :name="task.status === 'done' ? 'i-lucide-circle-check-big' : 'i-lucide-circle'" class="size-5" :class="task.status === 'done' ? 'text-[var(--color-accent)]' : 'text-secondary'" /></button>
        <div class="min-w-0 flex-1"><p class="truncate font-medium" :class="task.status === 'done' ? 'line-through text-secondary' : ''">{{ task.title }}</p><div class="mt-1 flex flex-wrap gap-2 text-xs text-secondary"><span v-if="task.dueDate">{{ task.dueDate }}</span><span class="capitalize">{{ task.priority }}</span><span v-for="tag in task.tags" :key="tag">#{{ tag }}</span></div></div>
        <button :title="task.archivedAt ? 'Відновити' : 'Архівувати'" @click="toggleArchive(task)"><UIcon :name="task.archivedAt ? 'i-lucide-archive-restore' : 'i-lucide-archive'" class="size-4 text-secondary" /></button>
      </article>
    </div>
    <div v-else class="glass-panel grid min-h-64 place-items-center p-8 text-center"><div><UIcon :name="icon" class="mx-auto mb-3 size-10 text-secondary" /><p class="font-medium">Тут поки порожньо</p><p class="mt-1 text-sm text-secondary">Задачі з’являться автоматично.</p></div></div>
  </div>
</template>
