<script setup lang="ts">
import { fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'
import type { Task } from '~/domain/entities/task'
import { priorityLabels } from '~/domain/services/taskLabels'

const tasks = ref<Task[]>([])
const loading = ref(true)
const selectedId = useLocalStorage('weekflow-focus-task', '')
const seconds = ref(25 * 60)
const running = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(async () => { try { tasks.value = (await fetchAllTasks()).filter(task => !task.archivedAt && task.status !== 'done').sort((a,b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent')) } finally { loading.value = false } })
onBeforeUnmount(() => clearInterval(timer))
const selected = computed(() => tasks.value.find(task => task.id === selectedId.value) || tasks.value[0])
const display = computed(() => `${String(Math.floor(seconds.value / 60)).padStart(2,'0')}:${String(seconds.value % 60).padStart(2,'0')}`)
function toggleTimer() { running.value = !running.value; clearInterval(timer); if (running.value) timer = setInterval(() => { if (seconds.value > 0) seconds.value--; else { running.value = false; clearInterval(timer) } }, 1000) }
function resetTimer() { running.value = false; clearInterval(timer); seconds.value = 25 * 60 }
async function complete() { if (!selected.value) return; await updateTask(selected.value.id, { status: 'done' }); tasks.value = tasks.value.filter(task => task.id !== selected.value!.id); selectedId.value = ''; resetTimer() }
</script>

<template><div class="app-container max-w-5xl"><PageHeader title="Фокус" description="Одна задача, один таймер, мінімум шуму." icon="i-lucide-timer" />
  <USkeleton v-if="loading" class="h-96 rounded-2xl" />
  <EmptyState v-else-if="!selected" title="Немає задач для фокусу" description="Створіть активну задачу або поверніться до дошки." icon="i-lucide-party-popper"><UButton to="/?new=1">Створити задачу</UButton></EmptyState>
  <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_20rem]"><section class="surface-card flex min-h-[28rem] flex-col items-center justify-center p-8 text-center"><span class="count-badge">{{ priorityLabels[selected.priority] }}</span><h2 class="font-display mt-6 max-w-xl text-2xl sm:text-3xl">{{ selected.title }}</h2><p v-if="selected.note" class="mt-3 max-w-xl text-sm text-secondary">{{ selected.note }}</p><p class="font-display my-10 text-7xl tabular-nums tracking-tight sm:text-8xl">{{ display }}</p><div class="flex gap-3"><UButton size="lg" :icon="running ? 'i-lucide-pause' : 'i-lucide-play'" @click="toggleTimer">{{ running ? 'Пауза' : 'Почати' }}</UButton><UButton size="lg" variant="soft" icon="i-lucide-rotate-ccw" @click="resetTimer">Скинути</UButton><UButton size="lg" color="success" variant="soft" icon="i-lucide-check" @click="complete">Готово</UButton></div></section><aside class="surface-card p-3"><p class="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-secondary">Наступні задачі</p><button v-for="task in tasks.slice(0,8)" :key="task.id" class="flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm" :class="task.id === selected?.id ? 'bg-[var(--color-bg-alt)] font-semibold' : 'hover:bg-[var(--color-bg-alt)]'" @click="selectedId = task.id; resetTimer()"><UIcon name="i-lucide-circle" class="size-4 shrink-0 text-secondary"/><span class="line-clamp-2">{{ task.title }}</span></button></aside></div>
</div></template>
