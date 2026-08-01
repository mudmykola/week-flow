<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, TaskPriority, TaskRecurrence } from '~/domain/entities/task'
import { getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'

const props = defineProps<{
  open: boolean
  task: Task | null
  defaultStatus?: Task['status']
  projects: Project[]
  assignees?: AssignableUser[]
  tagOptions?: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      title: string
      note: string | null
      status: Task['status']
      projectId: string | null
      priority: TaskPriority
      dueDate: string | null
      tags: string[]
      recurrence: TaskRecurrence | null
      assigneeId: string | null
      stageId: string | null
    }
  ]
}>()
const { t } = useI18n()

const title = ref('')
const note = ref('')
const status = ref<Task['status']>('todo')
const projectId = ref<string | null>(null)
const priority = ref<TaskPriority>('medium')
const dueDate = ref('')
const tags = ref('')
const recurrence = ref<TaskRecurrence | null>(null)
const assigneeId = ref<string | null>(null)
const stageId = ref<string | null>(null)
const workflowStages = ref<Array<{ id: string; name: string; category: Task['status'] }>>([])
const subtasks = ref<Array<{ id: string; title: string; done: boolean }>>([])
const comments = ref<Array<{ id: string; body: string; authorName: string; createdAt: number }>>([])
const newSubtask = ref('')
const newComment = ref('')
const recentTags = useLocalStorage<string[]>('weekflow-reusable-tags', [])
const taskDefaults = useLocalStorage<{
  projectId: string | null
  priority: TaskPriority
  recurrence: TaskRecurrence | null
  assigneeId: string | null
}>('weekflow-task-defaults', {
  projectId: null,
  priority: 'medium',
  recurrence: null,
  assigneeId: null
})

const selectedTags = computed(() =>
  tags.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
)
const availableTags = computed(() =>
  [...new Set([...(props.tagOptions ?? []), ...recentTags.value])]
    .filter((tag) => !selectedTags.value.includes(tag))
    .sort((a, b) => a.localeCompare(b, 'uk'))
    .slice(0, 12)
)

watch(
  () => [props.open, props.task] as const,
  ([isOpen, task]) => {
    if (!isOpen) return
    title.value = task?.title ?? ''
    note.value = task?.note ?? ''
    status.value = task?.status ?? props.defaultStatus ?? 'todo'
    const reusableProjectId = props.projects.some((project) => project.id === taskDefaults.value.projectId)
      ? taskDefaults.value.projectId
      : null
    const reusableAssigneeId = props.assignees?.some((person) => person.id === taskDefaults.value.assigneeId)
      ? taskDefaults.value.assigneeId
      : null
    projectId.value = task?.projectId ?? reusableProjectId
    priority.value = task?.priority ?? taskDefaults.value.priority
    dueDate.value = task?.dueDate ?? ''
    tags.value = task?.tags?.join(', ') ?? ''
    recurrence.value = task?.recurrence ?? taskDefaults.value.recurrence
    assigneeId.value = task?.assigneeId ?? reusableAssigneeId
    stageId.value = task?.stageId ?? null
    subtasks.value = []
    comments.value = []
    if (task) {
      $fetch<{ subtasks: typeof subtasks.value; comments: typeof comments.value }>(
        `/api/tasks/${task.id}/details`
      ).then((details) => {
        subtasks.value = details.subtasks
        comments.value = details.comments
      })
    }
  },
  { immediate: true }
)

function submit() {
  if (!title.value.trim()) return
  const normalizedTags = [...new Set(selectedTags.value)].slice(0, 10)
  recentTags.value = [...new Set([...normalizedTags, ...recentTags.value])].slice(0, 30)
  taskDefaults.value = {
    projectId: projectId.value,
    priority: priority.value,
    recurrence: recurrence.value,
    assigneeId: assigneeId.value
  }
  emit('save', {
    title: title.value.trim(),
    note: note.value.trim() || null,
    status: status.value,
    projectId: projectId.value,
    priority: priority.value,
    dueDate: dueDate.value || null,
    tags: normalizedTags,
    recurrence: recurrence.value,
    assigneeId: assigneeId.value,
    stageId: stageId.value
  })
}

function reuseTag(tag: string) {
  tags.value = [...new Set([...selectedTags.value, tag])].slice(0, 10).join(', ')
}

function removeTag(tag: string) {
  tags.value = selectedTags.value.filter((item) => item !== tag).join(', ')
}

watch(projectId, async (id) => {
  workflowStages.value = id
    ? await $fetch<Array<{ id: string; name: string; category: Task['status'] }>>(`/api/projects/${id}/workflow` as any)
    : []
  if (stageId.value && !workflowStages.value.some((stage) => stage.id === stageId.value)) stageId.value = null
})

watch(stageId, (id) => {
  const selected = workflowStages.value.find((stage) => stage.id === id)
  if (selected) status.value = selected.category
})

async function addSubtask() {
  if (!props.task || !newSubtask.value.trim()) return
  const item = await $fetch<(typeof subtasks.value)[number]>(`/api/tasks/${props.task.id}/subtasks`, {
    method: 'POST',
    body: { title: newSubtask.value }
  })
  subtasks.value.push(item)
  newSubtask.value = ''
}

async function toggleSubtask(item: (typeof subtasks.value)[number]) {
  item.done = !item.done
  await $fetch(`/api/subtasks/${item.id}`, { method: 'PATCH', body: { done: item.done } })
}

async function addComment() {
  if (!props.task || !newComment.value.trim()) return
  await $fetch(`/api/tasks/${props.task.id}/comments`, { method: 'POST', body: { body: newComment.value } })
  comments.value.push({
    id: crypto.randomUUID(),
    body: newComment.value,
    authorName: t('common.you'),
    createdAt: Date.now()
  })
  newComment.value = ''
}
</script>

<template>
  <AppDrawer
    class="task-editor"
    :open="open"
    :title="task ? $t('task.details') : $t('shell.newTask')"
    :eyebrow="task ? $t('task.identifier', { id: task.id.slice(0, 8) }) : $t('task.create')"
    icon="i-lucide-square-check-big"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <section class="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-alt)]/45 p-3.5 sm:p-4">
        <div class="mb-3 flex items-center gap-2">
          <span
            class="grid size-7 place-items-center rounded-lg bg-[var(--color-panel-bg)] text-[var(--color-accent)] shadow-sm"
          >
            <UIcon
              name="i-lucide-pencil-line"
              class="size-3.5"
            />
          </span>
          <h3 class="text-sm font-semibold">{{ $t('task.basics') }}</h3>
        </div>
        <FormField
          :label="$t('task.name')"
          icon="i-lucide-type"
          ><FormInput
            v-model="title"
            class="text-base font-semibold"
            :placeholder="$t('task.namePlaceholder')"
            @keyup.enter="submit"
        /></FormField>
        <FormField
          class="mt-3"
          :label="$t('task.note')"
          icon="i-lucide-align-left"
          ><FormTextarea
            v-model="note"
            rows="3"
            :placeholder="$t('task.notePlaceholder')"
        /></FormField>
      </section>
      <section class="rounded-2xl border border-[var(--color-panel-border)] p-3.5 sm:p-4">
        <div class="mb-3 flex items-center gap-2">
          <span class="grid size-7 place-items-center rounded-lg bg-[var(--color-bg-alt)] text-[var(--color-accent)]">
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="size-3.5"
            />
          </span>
          <h3 class="text-sm font-semibold">{{ $t('task.planning') }}</h3>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField
            :label="$t('task.status')"
            icon="i-lucide-circle-dashed"
            ><FormSelect v-model="status"
              ><option
                v-for="s in TASK_STATUSES"
                :key="s"
                :value="s"
              >
                {{ $t(getStatusLabel(s)) }}
              </option></FormSelect
            ></FormField
          >
          <FormField
            :label="$t('task.project')"
            icon="i-lucide-folder-kanban"
            ><FormSelect v-model="projectId"
              ><option :value="null">{{ $t('task.noProject') }}</option>
              <option
                v-for="project in projects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </option></FormSelect
            ></FormField
          >
          <FormField
            :label="$t('task.assignee')"
            icon="i-lucide-user-round"
            ><FormSelect v-model="assigneeId"
              ><option :value="null">{{ $t('task.unassigned') }}</option>
              <option
                v-for="person in assignees"
                :key="person.id"
                :value="person.id"
              >
                {{ person.name }}
              </option></FormSelect
            ></FormField
          >
          <FormField
            v-if="workflowStages.length"
            :label="$t('task.workflowStage')"
            icon="i-lucide-git-branch"
            ><FormSelect v-model="stageId"
              ><option :value="null">{{ $t('task.standardStatus') }}</option>
              <option
                v-for="item in workflowStages"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option></FormSelect
            ></FormField
          >
          <FormField
            :label="$t('task.priority')"
            icon="i-lucide-flag"
            ><FormSelect v-model="priority"
              ><option value="low">{{ $t('task.priorityValue.low') }}</option>
              <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
              <option value="high">{{ $t('task.priorityValue.high') }}</option>
              <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option></FormSelect
            ></FormField
          >
          <FormField
            :label="$t('task.deadline')"
            icon="i-lucide-calendar-days"
            ><FormInput
              v-model="dueDate"
              type="date"
          /></FormField>
          <FormField
            :label="$t('task.recurrence')"
            icon="i-lucide-repeat-2"
            ><FormSelect v-model="recurrence"
              ><option :value="null">{{ $t('task.noRecurrence') }}</option>
              <option value="daily">{{ $t('task.recurrenceValue.daily') }}</option>
              <option value="weekly">{{ $t('task.recurrenceValue.weekly') }}</option>
              <option value="monthly">{{ $t('task.recurrenceValue.monthly') }}</option></FormSelect
            ></FormField
          >
          <FormField
            class="sm:col-span-2"
            :label="$t('task.tags')"
            icon="i-lucide-tags"
          >
            <FormInput
              v-model="tags"
              :placeholder="$t('task.tagsPlaceholder')"
            />
            <div
              v-if="selectedTags.length"
              class="mt-2 flex flex-wrap gap-1.5"
            >
              <button
                v-for="tag in selectedTags"
                :key="tag"
                type="button"
                class="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_13%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent)]"
                :aria-label="$t('task.removeTag', { tag })"
                @click="removeTag(tag)"
              >
                #{{ tag }}
                <UIcon
                  name="i-lucide-x"
                  class="size-3"
                />
              </button>
            </div>
            <div
              v-if="availableTags.length"
              class="mt-2 flex flex-wrap gap-1.5"
              :aria-label="$t('task.savedTags')"
            >
              <button
                v-for="tag in availableTags"
                :key="tag"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-panel-border)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
                @click="reuseTag(tag)"
              >
                <UIcon
                  name="i-lucide-plus"
                  class="size-3"
                />{{ tag }}
              </button>
            </div>
          </FormField>
        </div>
      </section>
      <div
        v-if="task"
        class="grid gap-3 sm:grid-cols-2"
      >
        <section class="rounded-2xl border border-[var(--color-panel-border)] p-3.5">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UIcon
              name="i-lucide-list-checks"
              class="size-4 text-[var(--color-accent)]"
            />{{ $t('task.subtasks') }}
          </h3>
          <div class="space-y-2">
            <label
              v-for="item in subtasks"
              :key="item.id"
              class="flex items-center gap-2 text-sm"
              ><input
                :checked="item.done"
                type="checkbox"
                class="ui-checkbox"
                @change="toggleSubtask(item)"
              /><span :class="item.done ? 'text-secondary line-through' : ''">{{ item.title }}</span></label
            >
          </div>
          <div class="mt-2 flex gap-2">
            <FormInput
              v-model="newSubtask"
              size="sm"
              :placeholder="$t('task.newSubtask')"
              @keyup.enter="addSubtask"
            /><IconButton
              icon="i-lucide-plus"
              :label="$t('task.addSubtask')"
              size="sm"
              @click="addSubtask"
            />
          </div>
        </section>
        <section class="rounded-2xl border border-[var(--color-panel-border)] p-3.5">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UIcon
              name="i-lucide-messages-square"
              class="size-4 text-[var(--color-accent)]"
            />{{ $t('task.comments') }}
          </h3>
          <div class="max-h-32 space-y-2 overflow-y-auto">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="rounded-lg bg-black/[0.03] p-2 text-sm"
            >
              <p>{{ comment.body }}</p>
              <span class="text-secondary text-xs">{{ comment.authorName }}</span>
            </div>
          </div>
          <div class="mt-2 flex gap-2">
            <FormInput
              v-model="newComment"
              size="sm"
              :placeholder="$t('task.comment')"
              @keyup.enter="addComment"
            /><IconButton
              icon="i-lucide-send"
              :label="$t('common.send')"
              size="sm"
              @click="addComment"
            />
          </div>
        </section>
      </div>
    </div>
    <template #footer
      ><AppButton
        variant="ghost"
        icon="i-lucide-x"
        @click="emit('close')"
        >{{ $t('common.cancel') }}</AppButton
      ><AppButton
        variant="primary"
        icon="i-lucide-check"
        @click="submit"
        >{{ $t('common.save') }}</AppButton
      ></template
    >
  </AppDrawer>
</template>
