<script setup lang="ts">
import { createTask, fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'
import { getCurrentWeek } from '~/domain/services/week'
import type { Task } from '~/domain/entities/task'
const tasks = ref<Task[]>([])
const title = ref('')
const saving = ref(false)
const loading = ref(true)
onMounted(async()=>{ try { tasks.value=(await fetchAllTasks()).filter(task=>!task.archivedAt&&!task.projectId&&!task.dueDate&&task.status!=='done') } finally { loading.value=false } })
async function capture(){const value=title.value.trim();if(!value)return;saving.value=true;try{const task=await createTask({title:value,week:getCurrentWeek(),priority:'medium'});tasks.value.unshift(task);title.value=''}finally{saving.value=false}}
async function complete(task:Task){await updateTask(task.id,{status:'done'});tasks.value=tasks.value.filter(item=>item.id!==task.id)}
</script>
<template><div class="app-container max-w-5xl"><PageHeader title="Inbox" description="Швидко зафіксуйте думку, розберете її пізніше." icon="i-lucide-inbox" :count="tasks.length" />
  <form class="surface-card mb-4 flex gap-3 p-3" @submit.prevent="capture"><input v-model="title" class="h-11 min-w-0 flex-1 bg-transparent px-2 outline-none" placeholder="Що потрібно не забути?" autofocus><UButton type="submit" icon="i-lucide-plus" :loading="saving">Додати</UButton></form>
  <div v-if="loading" class="space-y-3"><USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" /></div><EmptyState v-else-if="!tasks.length" title="Inbox розібрано" description="Усі думки перетворені на плани — чудова робота." icon="i-lucide-inbox-check"/><div v-else class="surface-card divide-y divide-[var(--color-panel-border)]"><article v-for="task in tasks" :key="task.id" class="flex items-center gap-3 p-4"><button title="Виконати" @click="complete(task)"><UIcon name="i-lucide-circle" class="size-5 text-secondary"/></button><NuxtLink :to="`/?week=${task.week}`" class="min-w-0 flex-1 truncate font-medium">{{ task.title }}</NuxtLink><span class="text-xs text-secondary">{{ task.week }}</span></article></div>
</div></template>
