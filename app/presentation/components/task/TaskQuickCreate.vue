<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, TaskPriority, TaskStatus } from '~/domain/entities/task'

const props = defineProps<{
  status: TaskStatus
  projects: Project[]
  assignees: AssignableUser[]
  initialTitle?: string
}>()
const emit = defineEmits<{
  create: [
    payload: {
      title: string
      status: TaskStatus
      projectId: string | null
      assigneeId: string | null
      dueDate: string | null
      priority: TaskPriority
    }
  ]
  full: [status: TaskStatus]
  close: []
}>()
const title = ref('')
const projectId = ref<string | null>(null)
const assigneeId = ref<string | null>(null)
const dueDate = ref('')
const priority = ref<TaskPriority>('medium')
const expanded = ref(false)
const input = useTemplateRef<HTMLInputElement>('quickInput')
const fullDraft = useLocalStorage<Record<string, unknown> | null>('weekflow-task-draft-v2', null)
onMounted(() => {
  if (props.initialTitle) title.value = props.initialTitle
  input.value?.focus()
})
defineExpose({ focus: () => input.value?.focus() })
function submit() {
  if (!title.value.trim()) return
  emit('create', {
    title: title.value.trim(),
    status: props.status,
    projectId: projectId.value,
    assigneeId: assigneeId.value,
    dueDate: dueDate.value || null,
    priority: priority.value
  })
  title.value = ''
  nextTick(() => input.value?.focus())
}
function keydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  if (event.shiftKey) {
    const nextDraft = {
      title: title.value.trim(),
      status: props.status,
      projectId: projectId.value,
      assigneeId: assigneeId.value,
      dueDate: dueDate.value,
      priority: priority.value
    }
    fullDraft.value = nextDraft
    if (import.meta.client) localStorage.setItem('weekflow-task-draft-v2', JSON.stringify(nextDraft))
    emit('full', props.status)
  } else submit()
}
</script>

<template>
  <div
    class="task-quick-create rounded-xl border border-[var(--color-accent)] bg-[var(--color-panel-bg)] p-2.5 shadow-lg"
  >
    <div class="flex items-center gap-2">
      <UIcon
        name="i-lucide-plus"
        class="text-[var(--color-accent)]"
      />
      <input
        ref="quickInput"
        v-model="title"
        type="text"
        class="min-w-0 flex-1 bg-transparent text-sm outline-none"
        :placeholder="$t('task.quickCreatePlaceholder')"
        @keydown="keydown"
      />
      <IconButton
        icon="i-lucide-sliders-horizontal"
        :label="$t('task.quickOptions')"
        size="sm"
        @click="expanded = !expanded"
      />
      <IconButton
        icon="i-lucide-x"
        :label="$t('common.close')"
        size="sm"
        @click="emit('close')"
      />
    </div>
    <div
      v-if="expanded"
      class="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--color-panel-border)] pt-2"
    >
      <FormSelect
        v-model="projectId"
        :aria-label="$t('task.project')"
        ><option :value="null">{{ $t('task.noProject') }}</option>
        <option
          v-for="project in projects"
          :key="project.id"
          :value="project.id"
        >
          {{ project.name }}
        </option></FormSelect
      >
      <FormSelect
        v-model="assigneeId"
        :aria-label="$t('task.assignee')"
        ><option :value="null">{{ $t('task.unassigned') }}</option>
        <option
          v-for="person in assignees"
          :key="person.id"
          :value="person.id"
        >
          {{ person.name }}
        </option></FormSelect
      >
      <FormInput
        v-model="dueDate"
        type="date"
        :aria-label="$t('task.deadline')"
      />
      <FormSelect
        v-model="priority"
        :aria-label="$t('task.priority')"
        ><option value="low">{{ $t('task.priorityValue.low') }}</option>
        <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
        <option value="high">{{ $t('task.priorityValue.high') }}</option>
        <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option></FormSelect
      >
    </div>
    <p class="text-secondary mt-2 text-[10px]">{{ $t('task.quickCreateHint') }}</p>
  </div>
</template>
