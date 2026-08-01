<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'
import { getStatusLabel } from '~/domain/services/taskStatus'

const props = defineProps<{
  task: Task
  project: Project | null
  compact?: boolean
  selected?: boolean
  assigneeName?: string
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  cycleStatus: [task: Task]
  select: [id: string, selected: boolean]
  duplicate: [id: string]
  inlineTitle: [id: string, title: string]
}>()

const menuOpen = ref(false)
const editingTitle = ref(false)
const draftTitle = ref(props.task.title)
function saveTitle() {
  const value = draftTitle.value.trim()
  editingTitle.value = false
  if (value && value !== props.task.title) emit('inlineTitle', props.task.id, value)
}
function startEditingTitle() {
  draftTitle.value = props.task.title
  editingTitle.value = true
}
function duplicateAndClose() {
  emit('duplicate', props.task.id)
  menuOpen.value = false
}
function deleteAndClose() {
  emit('delete', props.task.id)
  menuOpen.value = false
}

const statusDotColor: Record<Task['status'], string> = {
  todo: 'var(--color-status-todo)',
  in_progress: 'var(--color-status-in-progress)',
  done: 'var(--color-status-done)'
}
const priorityColor: Record<Task['priority'], string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444'
}
</script>

<template>
  <article
    class="task-card group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    :class="[
      { 'task-card--done task-done': task.status === 'done' },
      compact ? 'task-card--compact p-2.5' : 'task-card--comfortable p-3'
    ]"
    role="button"
    tabindex="0"
    @click="emit('edit', task)"
    @keydown.enter="emit('edit', task)"
    @keydown.space.prevent="emit('edit', task)"
  >
    <div class="flex items-start gap-3">
      <button
        type="button"
        class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--color-panel-border)]"
        :style="{ backgroundColor: statusDotColor[task.status] }"
        :title="$t(getStatusLabel(task.status))"
        @click.stop="emit('cycleStatus', task)"
      />
      <input
        :checked="selected"
        type="checkbox"
        class="mt-1 accent-[var(--color-accent)]"
        :aria-label="$t('taskActions.select')"
        @click.stop
        @change="emit('select', task.id, ($event.target as HTMLInputElement).checked)"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="h-4 w-1 shrink-0 rounded-full"
            :style="{ backgroundColor: priorityColor[task.priority ?? 'medium'] }"
          /><input
            v-if="editingTitle"
            v-model="draftTitle"
            class="min-w-0 flex-1 rounded-md border border-[var(--color-accent)] bg-transparent px-1 text-sm font-semibold outline-none"
            autofocus
            @click.stop
            @keyup.enter="saveTitle"
            @keyup.esc="editingTitle = false"
            @blur="saveTitle"
          />
          <p
            v-else
            class="truncate text-sm font-semibold"
            @dblclick.stop="startEditingTitle"
          >
            {{ task.title }}
          </p>
        </div>
        <p
          v-if="task.note && !compact"
          class="text-secondary mt-1 truncate text-sm"
        >
          {{ task.note }}
        </p>
        <ProjectBadge
          v-if="project"
          :project="project"
          class="mt-2.5"
        />
        <div
          v-if="task.dueDate || assigneeName || (!compact && (task.recurrence || task.tags?.length))"
          class="text-secondary mt-2.5 flex flex-wrap items-center gap-2 text-xs"
        >
          <span
            v-if="task.dueDate"
            class="inline-flex items-center gap-1"
            ><UIcon name="i-lucide-calendar" />{{ task.dueDate }}</span
          ><span
            v-if="assigneeName"
            class="inline-flex items-center gap-1"
            ><UIcon name="i-lucide-user-round" />{{ assigneeName }}</span
          ><UIcon
            v-if="task.recurrence && !compact"
            name="i-lucide-repeat-2"
          /><span
            v-for="tag in compact ? [] : task.tags"
            :key="tag"
            >#{{ tag }}</span
          >
        </div>
      </div>
      <div class="relative opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconButton
          icon="i-lucide-ellipsis"
          :label="$t('taskActions.actions')"
          size="sm"
          @click.stop="menuOpen = !menuOpen"
        /><DropdownMenu
          :open="menuOpen"
          @click.stop
          ><AppButton
            class="w-full justify-start"
            variant="ghost"
            size="sm"
            icon="i-lucide-copy"
            @click="duplicateAndClose"
            >{{ $t('taskActions.duplicate') }}</AppButton
          ><AppButton
            class="w-full justify-start"
            variant="danger"
            size="sm"
            icon="i-lucide-trash-2"
            @click="deleteAndClose"
            >{{ $t('common.delete') }}</AppButton
          ></DropdownMenu
        >
      </div>
    </div>
  </article>
</template>
