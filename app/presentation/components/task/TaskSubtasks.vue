<script setup lang="ts">
import draggable from 'vuedraggable'
import type { AssignableUser, Subtask, Task } from '~/domain/entities/task'

const props = defineProps<{ task: Task; modelValue: Subtask[]; assignees: AssignableUser[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: Subtask[]]; promoted: [task: Task] }>()
const items = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) })
const input = ref('')
const creating = ref(false)
const error = ref('')
const hideDone = ref(false)
const visibleItems = computed(() => (hideDone.value ? items.value.filter((item) => !item.done) : items.value))
const completed = computed(() => items.value.filter((item) => item.done).length)
const patchQueues = new Map<string, Promise<void>>()

async function createLines() {
  const lines = input.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length || creating.value) return
  creating.value = true
  error.value = ''
  try {
    const created = []
    for (const title of lines) {
      created.push(await $fetch<Subtask>(`/api/tasks/${props.task.id}/subtasks`, { method: 'POST', body: { title } }))
    }
    items.value = [...items.value, ...created]
    input.value = ''
  } catch {
    error.value = 'create'
  } finally {
    creating.value = false
  }
}
async function patch(id: string, patchValue: Partial<Subtask>) {
  const index = items.value.findIndex((item) => item.id === id)
  if (index < 0) return
  const previous = items.value[index]!
  items.value = items.value.map((item) => (item.id === id ? { ...item, ...patchValue } : item))
  try {
    const updated = await $fetch<Subtask>(`/api/subtasks/${id}`, { method: 'PATCH', body: patchValue })
    items.value = items.value.map((item) => (item.id === id ? updated : item))
  } catch (error) {
    items.value = items.value.map((item) => (item.id === id ? previous : item))
    throw error
  }
}
async function safePatch(id: string, patchValue: Partial<Subtask>) {
  error.value = ''
  const queued = (patchQueues.get(id) ?? Promise.resolve())
    .then(() => patch(id, patchValue))
    .catch(() => {
      error.value = 'save'
    })
    .finally(() => {
      if (patchQueues.get(id) === queued) patchQueues.delete(id)
    })
  patchQueues.set(id, queued)
  await queued
}
async function reorder() {
  error.value = ''
  try {
    await Promise.all(items.value.map((item, sort) => (item.sort === sort ? null : patch(item.id, { sort }))))
  } catch {
    error.value = 'save'
  }
}
async function duplicate(id: string) {
  error.value = ''
  try {
    const item = await $fetch<Subtask>(`/api/subtasks/${id}/duplicate`, { method: 'POST' })
    items.value = [...items.value, item].sort((a, b) => a.sort - b.sort)
  } catch {
    error.value = 'save'
  }
}
async function remove(id: string) {
  const previous = items.value
  items.value = items.value.filter((item) => item.id !== id)
  try {
    await $fetch(`/api/subtasks/${id}` as any, { method: 'DELETE' })
  } catch {
    items.value = previous
    error.value = 'delete'
  }
}
async function promote(id: string) {
  error.value = ''
  try {
    const task = await $fetch<Task>(`/api/subtasks/${id}/promote`, { method: 'POST' })
    items.value = items.value.filter((item) => item.id !== id)
    emit('promoted', task)
  } catch {
    error.value = 'promote'
  }
}
async function completeAll() {
  const ids = items.value.filter((item) => !item.done).map((item) => item.id)
  if (!ids.length) return
  error.value = ''
  try {
    await $fetch('/api/subtasks/bulk', { method: 'PATCH', body: { ids, patch: { done: true } } })
    items.value = items.value.map((item) => (ids.includes(item.id) ? { ...item, done: true, status: 'done' } : item))
  } catch {
    error.value = 'save'
  }
}
</script>

<template>
  <section class="task-subtasks rounded-2xl border border-[var(--color-panel-border)] p-4">
    <header class="mb-3 flex flex-wrap items-center gap-2">
      <h3 class="mr-auto flex items-center gap-2 text-sm font-semibold">
        <UIcon name="i-lucide-list-checks" />{{ $t('task.subtasks') }}
        <span class="count-badge">{{ completed }}/{{ items.length }}</span>
      </h3>
      <button
        v-if="completed"
        type="button"
        class="text-secondary text-xs"
        @click="hideDone = !hideDone"
      >
        {{ hideDone ? $t('board.showDone') : $t('board.hideDone') }}
      </button>
      <button
        v-if="items.some((item) => !item.done)"
        type="button"
        class="text-xs text-[var(--color-accent)]"
        @click="completeAll"
      >
        {{ $t('task.completeAllSubtasks') }}
      </button>
    </header>
    <div
      v-if="items.length"
      class="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-alt)]"
    >
      <div
        class="h-full bg-[var(--color-accent)] transition-all"
        :style="{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }"
      />
    </div>
    <draggable
      v-model="items"
      item-key="id"
      handle=".cursor-grab"
      class="space-y-2"
      @end="reorder"
    >
      <template #item="{ element }"
        ><TaskSubtaskItem
          v-if="!hideDone || !element.done"
          :item="element"
          :assignees="assignees"
          @patch="safePatch"
          @duplicate="duplicate"
          @promote="promote"
          @delete="remove"
      /></template>
    </draggable>
    <div class="mt-3 flex items-start gap-2">
      <FormTextarea
        v-model="input"
        rows="1"
        :placeholder="$t('task.multiSubtaskPlaceholder')"
        @keydown.enter.exact.prevent="createLines"
      />
      <IconButton
        icon="i-lucide-plus"
        :label="$t('task.addSubtask')"
        :disabled="creating"
        @click="createLines"
      />
    </div>
    <p class="text-secondary mt-1 text-[11px]">{{ $t('task.multiSubtaskHint') }}</p>
    <p
      v-if="error"
      class="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-danger)]"
      role="alert"
    >
      <UIcon name="i-lucide-circle-alert" />{{ $t(`task.subtaskError.${error}`) }}
    </p>
  </section>
</template>
