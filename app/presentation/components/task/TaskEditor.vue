<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, TaskPriority, TaskRecurrence, UpdateTaskInput } from '~/domain/entities/task'

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
  updated: [task: Task]
  promoted: [task: Task]
  save: [
    payload: Required<Pick<Task, 'title' | 'status' | 'priority'>> & {
      note: string | null
      projectId: string | null
      dueDate: string | null
      plannedDate: string | null
      plannedTime: string | null
      estimateMinutes: number | null
      dayRank: number | null
      tags: string[]
      recurrence: TaskRecurrence | null
      assigneeId: string | null
      stageId: string | null
    }
  ]
}>()
const { t } = useI18n()
const taskRef = toRef(props, 'task')
const {
  subtasks,
  comments,
  activity,
  loading: detailsLoading,
  error: detailsError,
  load: loadDetails
} = useTaskDetails(taskRef)
const titleEditor = useTemplateRef<{ focus: () => void }>('titleEditor')

const title = ref('')
const note = ref('')
const status = ref<Task['status']>('todo')
const projectId = ref<string | null>(null)
const priority = ref<TaskPriority>('medium')
const dueDate = ref('')
const plannedDate = ref('')
const plannedTime = ref('')
const estimateMinutes = ref<number | null>(null)
const dayRank = ref<number | null>(null)
const recurrence = ref<TaskRecurrence | null>(null)
const assigneeId = ref<string | null>(null)
const stageId = ref<string | null>(null)
const tags = ref<string[]>([])
const workflowStages = ref<Array<{ id: string; name: string; category: Task['status'] }>>([])
const hydrated = ref(false)
const submitting = ref(false)
const draft = useLocalStorage<Record<string, unknown> | null>('weekflow-task-draft-v2', null)
const recentTags = useLocalStorage<string[]>('weekflow-reusable-tags', [])
const taskDefaults = useLocalStorage<{
  projectId: string | null
  priority: TaskPriority
  recurrence: TaskRecurrence | null
  assigneeId: string | null
}>('weekflow-task-defaults', { projectId: null, priority: 'medium', recurrence: null, assigneeId: null })
type Template = {
  id: string
  title: string
  note: string
  priority: TaskPriority
  recurrence: TaskRecurrence | null
  tags: string[]
}
const templates = useLocalStorage<Template[]>('weekflow-task-templates', [
  {
    id: 'weekly-review',
    title: t('pages.templates.defaultReview'),
    note: t('pages.templates.defaultReviewNote'),
    priority: 'medium',
    recurrence: 'weekly',
    tags: ['review']
  },
  {
    id: 'client-call',
    title: t('pages.templates.defaultCall'),
    note: t('pages.templates.defaultCallNote'),
    priority: 'high',
    recurrence: null,
    tags: ['client']
  }
])
const selectedTemplateId = ref<string | null>(null)
watch(selectedTemplateId, (id) => {
  const template = templates.value.find((item) => item.id === id)
  if (!template) return
  title.value = template.title
  note.value = template.note
  priority.value = template.priority
  recurrence.value = template.recurrence
  tags.value = [...template.tags]
  selectedTemplateId.value = null
})
const availableTags = computed(() =>
  [...new Set([...(props.tagOptions ?? []), ...recentTags.value])]
    .filter((tag) => !tags.value.includes(tag))
    .slice(0, 12)
)
function readStoredDraft() {
  if (!import.meta.client) return draft.value
  try {
    return JSON.parse(localStorage.getItem('weekflow-task-draft-v2') ?? 'null') as Record<string, unknown> | null
  } catch {
    return draft.value
  }
}

const {
  state: saveState,
  error: saveError,
  schedule: scheduleSave,
  flush: flushSave,
  cancel: cancelSave
} = useTaskAutosave(async (patch) => {
  if (!props.task) return
  const updated = await $fetch<Task>(`/api/tasks/${props.task.id}`, { method: 'PATCH', body: patch })
  emit('updated', updated)
})

function payload() {
  return {
    title: title.value.trim(),
    note: note.value.trim() || null,
    status: status.value,
    projectId: projectId.value,
    priority: priority.value,
    dueDate: dueDate.value || null,
    plannedDate: plannedDate.value || null,
    plannedTime: plannedTime.value || null,
    estimateMinutes: estimateMinutes.value,
    dayRank: dayRank.value,
    tags: tags.value,
    recurrence: recurrence.value,
    assigneeId: assigneeId.value,
    stageId: stageId.value
  }
}

watch(
  [() => props.open, () => props.task?.id],
  ([open]) => {
    if (!open) return
    const task = props.task
    hydrated.value = false
    cancelSave()
    const savedDraft = !task ? readStoredDraft() : null
    title.value = task?.title ?? String(savedDraft?.title ?? '')
    note.value = task?.note ?? String(savedDraft?.note ?? '')
    status.value = task?.status ?? (savedDraft?.status as Task['status']) ?? props.defaultStatus ?? 'todo'
    projectId.value = task?.projectId ?? (savedDraft?.projectId as string | null) ?? taskDefaults.value.projectId
    priority.value = task?.priority ?? (savedDraft?.priority as TaskPriority) ?? taskDefaults.value.priority
    dueDate.value = task?.dueDate ?? String(savedDraft?.dueDate ?? '')
    plannedDate.value = task?.plannedDate ?? String(savedDraft?.plannedDate ?? '')
    plannedTime.value = task?.plannedTime ?? String(savedDraft?.plannedTime ?? '')
    estimateMinutes.value = task?.estimateMinutes ?? (savedDraft?.estimateMinutes as number | null) ?? null
    dayRank.value = task?.dayRank ?? (savedDraft?.dayRank as number | null) ?? null
    recurrence.value =
      task?.recurrence ?? (savedDraft?.recurrence as TaskRecurrence | null) ?? taskDefaults.value.recurrence
    assigneeId.value = task?.assigneeId ?? (savedDraft?.assigneeId as string | null) ?? taskDefaults.value.assigneeId
    stageId.value = task?.stageId ?? null
    tags.value = task?.tags ? [...task.tags] : []
    hydrated.value = true
    void nextTick(() => titleEditor.value?.focus())
  },
  { immediate: true }
)

watch(
  [
    title,
    note,
    status,
    projectId,
    priority,
    dueDate,
    plannedDate,
    plannedTime,
    estimateMinutes,
    dayRank,
    recurrence,
    assigneeId,
    stageId,
    tags
  ],
  () => {
    if (!hydrated.value || !props.open) return
    const value = payload()
    if (props.task) scheduleSave(value as UpdateTaskInput)
    else draft.value = value
  },
  { deep: true }
)

let stageRequest = 0
watch(projectId, async (id) => {
  const request = ++stageRequest
  try {
    const result = id
      ? await $fetch<Array<{ id: string; name: string; category: Task['status'] }>>(
          `/api/projects/${id}/workflow` as any
        )
      : []
    if (request !== stageRequest) return
    workflowStages.value = result
    if (stageId.value && !result.some((item) => item.id === stageId.value)) stageId.value = null
  } catch {
    if (request === stageRequest) workflowStages.value = []
  }
})
watch(stageId, (id) => {
  const stage = workflowStages.value.find((item) => item.id === id)
  if (stage) status.value = stage.category
})

async function submit() {
  if (!title.value.trim() || submitting.value) return
  submitting.value = true
  try {
    recentTags.value = [...new Set([...tags.value, ...recentTags.value])].slice(0, 30)
    taskDefaults.value = {
      projectId: projectId.value,
      priority: priority.value,
      recurrence: recurrence.value,
      assigneeId: assigneeId.value
    }
    if (props.task) {
      scheduleSave(payload())
      await flushSave()
    } else {
      emit('save', payload())
      draft.value = null
    }
  } finally {
    submitting.value = false
  }
}
function addTag(event: KeyboardEvent) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim().replace(/^#/, '')
  if (!value || tags.value.includes(value) || tags.value.length >= 10) return
  addTagValue(value)
  input.value = ''
}
function addTagValue(value: string) {
  const normalized = value.trim().replace(/^#/, '')
  if (!normalized || tags.value.includes(normalized) || tags.value.length >= 10) return
  tags.value = [...tags.value, normalized]
  recentTags.value = [...new Set([normalized, ...recentTags.value])].slice(0, 30)
}
function updateSubtasks(value: typeof subtasks.value) {
  subtasks.value = value
  if (!props.task) return
  emit('updated', {
    ...props.task,
    subtaskCount: value.length,
    completedSubtaskCount: value.filter((item) => item.done).length
  })
}
function updateComments(value: typeof comments.value) {
  comments.value = value
  if (props.task) emit('updated', { ...props.task, commentCount: value.length })
}
async function close() {
  if (props.task) {
    scheduleSave(payload())
    if (!(await flushSave())) return
  }
  emit('close')
}
useTaskKeyboard({
  enabled: computed(() => props.open),
  onCreate: () => {},
  onEdit: () => {},
  onClose: close,
  onSave: submit,
  onSearch: () => {},
  onMove: () => {},
  onCommands: () => {}
})
</script>

<template>
  <AppDrawer
    class="task-editor task-workspace"
    :open="open"
    :title="task ? $t('task.details') : $t('shell.newTask')"
    :eyebrow="task ? $t('task.identifier', { id: task.id.slice(0, 8) }) : $t('task.create')"
    icon="i-lucide-square-check-big"
    size="fullscreen"
    @close="close"
  >
    <div class="task-workspace__content space-y-4">
      <header class="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <span class="text-secondary text-xs">{{ task ? $t('task.editing') : $t('task.newDraft') }}</span>
          <span
            class="inline-flex items-center gap-1.5 text-xs"
            :class="saveState === 'error' ? 'text-[var(--color-danger)]' : 'text-secondary'"
          >
            <UIcon
              :name="
                saveState === 'saving'
                  ? 'i-lucide-loader-circle'
                  : saveState === 'error'
                    ? 'i-lucide-circle-alert'
                    : 'i-lucide-cloud-check'
              "
              :class="{ 'animate-spin': saveState === 'saving' }"
            />
            {{
              saveState === 'saving'
                ? $t('task.saving')
                : saveState === 'error'
                  ? $t('task.saveFailed')
                  : task
                    ? $t('task.saved')
                    : $t('task.draftSaved')
            }}
          </span>
        </div>
        <TaskTitleEditor
          ref="titleEditor"
          v-model="title"
          :placeholder="$t('task.namePlaceholder')"
        />
        <p
          v-if="saveError"
          class="mt-2 text-xs text-[var(--color-danger)]"
        >
          {{ saveError }}
        </p>
      </header>

      <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div class="space-y-4">
          <TaskDescription v-model="note" />
          <section class="rounded-2xl border border-[var(--color-panel-border)] p-4">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <UIcon name="i-lucide-tags" />{{ $t('task.tags') }}
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="tag in tags"
                :key="tag"
                type="button"
                class="rounded-full bg-[var(--color-bg-alt)] px-2.5 py-1 text-xs"
                :aria-label="$t('task.removeTag', { tag })"
                @click="tags = tags.filter((item) => item !== tag)"
              >
                #{{ tag }} <UIcon name="i-lucide-x" />
              </button>
            </div>
            <FormInput
              class="mt-2"
              :placeholder="$t('task.tagsPlaceholder')"
              @keyup.enter="addTag"
            />
            <div
              v-if="availableTags.length"
              class="mt-2 flex flex-wrap gap-1.5"
            >
              <button
                v-for="tag in availableTags"
                :key="tag"
                type="button"
                class="text-secondary rounded-full border border-dashed border-[var(--color-panel-border)] px-2.5 py-1 text-xs hover:text-[var(--color-accent)]"
                @click="addTagValue(tag)"
              >
                <UIcon name="i-lucide-plus" />{{ tag }}
              </button>
            </div>
          </section>
        </div>
        <TaskProperties
          v-model:status="status"
          v-model:project-id="projectId"
          v-model:assignee-id="assigneeId"
          v-model:priority="priority"
          v-model:due-date="dueDate"
          v-model:planned-date="plannedDate"
          v-model:planned-time="plannedTime"
          v-model:estimate-minutes="estimateMinutes"
          v-model:day-rank="dayRank"
          v-model:stage-id="stageId"
          v-model:recurrence="recurrence"
          :projects="projects"
          :assignees="assignees ?? []"
          :stages="workflowStages"
        />
      </div>

      <template v-if="task">
        <div
          v-if="detailsLoading"
          class="grid gap-3 sm:grid-cols-2"
        >
          <div
            v-for="index in 2"
            :key="index"
            class="skeleton h-40 rounded-2xl"
          />
        </div>
        <div
          v-else-if="detailsError"
          class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4"
          role="alert"
        >
          <span class="flex items-center gap-2 text-sm text-[var(--color-danger)]">
            <UIcon name="i-lucide-circle-alert" />{{ $t('task.detailsLoadError') }}
          </span>
          <AppButton
            size="sm"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            @click="loadDetails"
            >{{ $t('common.tryAgain') }}</AppButton
          >
        </div>
        <TaskSubtasks
          v-else
          :model-value="subtasks"
          :task="task"
          :assignees="assignees ?? []"
          @update:model-value="updateSubtasks"
          @promoted="emit('promoted', $event)"
        />
        <div class="grid gap-4 lg:grid-cols-2">
          <TaskComments
            :model-value="comments"
            :task-id="task.id"
            @update:model-value="updateComments"
          /><TaskActivity :items="activity" />
        </div>
      </template>
    </div>
    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <FormSelect
          v-if="!task && templates.length"
          v-model="selectedTemplateId"
          class="w-44"
          :placeholder="$t('task.loadTemplate')"
        >
          <option
            v-for="item in templates"
            :key="item.id"
            :value="item.id"
          >
            {{ item.title }}
          </option>
        </FormSelect>
        <span class="text-secondary hidden text-xs sm:block">{{ $t('task.saveShortcut') }}</span>
        <div class="ml-auto flex gap-2">
          <AppButton
            variant="ghost"
            icon="i-lucide-x"
            @click="close"
            >{{ $t('common.close') }}</AppButton
          ><AppButton
            v-if="!task"
            variant="primary"
            icon="i-lucide-check"
            :disabled="submitting || !title.trim()"
            @click="submit"
            >{{ $t('common.create') }}</AppButton
          >
        </div>
      </div>
    </template>
  </AppDrawer>
</template>
