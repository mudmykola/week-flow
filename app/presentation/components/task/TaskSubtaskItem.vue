<script setup lang="ts">
import type { AssignableUser, Subtask, TaskPriority, TaskStatus } from '~/domain/entities/task'

const props = defineProps<{ item: Subtask; assignees: AssignableUser[] }>()
const emit = defineEmits<{
  patch: [id: string, patch: Partial<Subtask>]
  duplicate: [id: string]
  promote: [id: string]
  delete: [id: string]
}>()
const expanded = ref(false)
const menuOpen = ref(false)
const title = ref(props.item.title)
const note = ref(props.item.note ?? '')
watch(
  () => [props.item.title, props.item.note] as const,
  ([nextTitle, nextNote]) => {
    title.value = nextTitle
    note.value = nextNote ?? ''
  }
)
function saveTitle() {
  const value = title.value.trim()
  if (value && value !== props.item.title) emit('patch', props.item.id, { title: value })
}
function saveNote() {
  const value = note.value.trim() || null
  if (value !== props.item.note) emit('patch', props.item.id, { note: value })
}
function duplicateAndClose() {
  emit('duplicate', props.item.id)
  menuOpen.value = false
}
function promoteAndClose() {
  emit('promote', props.item.id)
  menuOpen.value = false
}
function deleteAndClose() {
  emit('delete', props.item.id)
  menuOpen.value = false
}
</script>

<template>
  <article
    class="task-subtask-item group rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-2.5"
  >
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="text-secondary cursor-grab"
        :aria-label="$t('task.dragSubtask')"
      >
        <UIcon name="i-lucide-grip-vertical" />
      </button>
      <input
        :checked="item.done"
        type="checkbox"
        class="ui-checkbox"
        @change="emit('patch', item.id, { done: !item.done, status: item.done ? 'todo' : 'done' })"
      />
      <input
        v-model="title"
        class="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
        :class="item.done ? 'text-secondary line-through' : ''"
        @blur="saveTitle"
        @keyup.enter="($event.target as HTMLInputElement).blur()"
      />
      <button
        type="button"
        class="text-secondary grid size-8 place-items-center rounded-lg hover:bg-[var(--color-bg-alt)]"
        @click="expanded = !expanded"
      >
        <UIcon :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
      </button>
      <div class="relative">
        <IconButton
          icon="i-lucide-ellipsis"
          :label="$t('taskActions.actions')"
          size="sm"
          @click="menuOpen = !menuOpen"
        />
        <DropdownMenu :open="menuOpen">
          <AppButton
            variant="ghost"
            size="sm"
            icon="i-lucide-copy"
            class="w-full justify-start"
            @click="duplicateAndClose"
            >{{ $t('taskActions.duplicate') }}</AppButton
          >
          <AppButton
            variant="ghost"
            size="sm"
            icon="i-lucide-arrow-up-right"
            class="w-full justify-start"
            @click="promoteAndClose"
            >{{ $t('task.promoteSubtask') }}</AppButton
          >
          <AppButton
            variant="danger"
            size="sm"
            icon="i-lucide-trash-2"
            class="w-full justify-start"
            @click="deleteAndClose"
            >{{ $t('common.delete') }}</AppButton
          >
        </DropdownMenu>
      </div>
    </div>
    <div
      v-if="expanded"
      class="mt-3 grid gap-2 border-t border-[var(--color-panel-border)] pt-3 sm:grid-cols-2"
    >
      <FormTextarea
        v-model="note"
        rows="2"
        :placeholder="$t('task.note')"
        @blur="saveNote"
      />
      <div class="grid grid-cols-2 gap-2">
        <FormSelect
          :model-value="item.status"
          @update:model-value="emit('patch', item.id, { status: $event as TaskStatus })"
        >
          <option value="todo">{{ $t('task.statusValue.todo') }}</option>
          <option value="in_progress">{{ $t('task.statusValue.in_progress') }}</option>
          <option value="done">{{ $t('task.statusValue.done') }}</option>
        </FormSelect>
        <FormSelect
          :model-value="item.priority"
          @update:model-value="emit('patch', item.id, { priority: $event as TaskPriority })"
        >
          <option value="low">{{ $t('task.priorityValue.low') }}</option>
          <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
          <option value="high">{{ $t('task.priorityValue.high') }}</option>
          <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option>
        </FormSelect>
        <FormInput
          :model-value="item.dueDate ?? ''"
          type="date"
          @update:model-value="emit('patch', item.id, { dueDate: $event ? String($event) : null })"
        />
        <FormSelect
          :model-value="item.assigneeId"
          @update:model-value="emit('patch', item.id, { assigneeId: ($event as string) || null })"
        >
          <option :value="null">{{ $t('task.unassigned') }}</option>
          <option
            v-for="person in assignees"
            :key="person.id"
            :value="person.id"
          >
            {{ person.name }}
          </option>
        </FormSelect>
      </div>
    </div>
  </article>
</template>
