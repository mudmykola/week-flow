<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { Task, TaskPriority, TaskRecurrence } from '~/domain/entities/task'
import { getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'

const props = defineProps<{
  open: boolean
  task: Task | null
  defaultStatus?: Task['status']
  projects: Project[]
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { title: string; note: string | null; status: Task['status']; projectId: string | null; priority: TaskPriority; dueDate: string | null; tags: string[]; recurrence: TaskRecurrence | null }]
}>()

const title = ref('')
const note = ref('')
const status = ref<Task['status']>('todo')
const projectId = ref<string | null>(null)
const priority = ref<TaskPriority>('medium')
const dueDate = ref('')
const tags = ref('')
const recurrence = ref<TaskRecurrence | null>(null)
const subtasks = ref<Array<{ id: string; title: string; done: boolean }>>([])
const comments = ref<Array<{ id: string; body: string; authorName: string; createdAt: number }>>([])
const newSubtask = ref('')
const newComment = ref('')

watch(
  () => [props.open, props.task] as const,
  ([isOpen, task]) => {
    if (!isOpen) return
    title.value = task?.title ?? ''
    note.value = task?.note ?? ''
    status.value = task?.status ?? props.defaultStatus ?? 'todo'
    projectId.value = task?.projectId ?? null
    priority.value = task?.priority ?? 'medium'
    dueDate.value = task?.dueDate ?? ''
    tags.value = task?.tags?.join(', ') ?? ''
    recurrence.value = task?.recurrence ?? null
    subtasks.value = []
    comments.value = []
    if (task) {
      $fetch<{ subtasks: typeof subtasks.value; comments: typeof comments.value }>(`/api/tasks/${task.id}/details`).then((details) => {
        subtasks.value = details.subtasks
        comments.value = details.comments
      })
    }
  },
  { immediate: true }
)

function submit() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value.trim(),
    note: note.value.trim() || null,
    status: status.value,
    projectId: projectId.value,
    priority: priority.value,
    dueDate: dueDate.value || null,
    tags: tags.value.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 10),
    recurrence: recurrence.value
  })
}

async function addSubtask() {
  if (!props.task || !newSubtask.value.trim()) return
  const item = await $fetch<(typeof subtasks.value)[number]>(`/api/tasks/${props.task.id}/subtasks`, { method: 'POST', body: { title: newSubtask.value } })
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
  comments.value.push({ id: crypto.randomUUID(), body: newComment.value, authorName: 'Ви', createdAt: Date.now() })
  newComment.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="emit('close')"
    >
      <div class="glass-panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
        <h2 class="font-display mb-6 text-2xl">{{ task ? 'Редагувати задачу' : 'Нова задача' }}</h2>

        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm text-secondary">Назва</label>
            <input
              v-model="title"
              type="text"
              class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-base outline-none focus:border-[var(--color-accent)]"
              placeholder="Назва задачі"
              @keyup.enter="submit"
            >
          </div>

          <div>
            <label class="mb-1.5 block text-sm text-secondary">Нотатка</label>
            <textarea
              v-model="note"
              rows="3"
              class="w-full resize-none rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-base outline-none focus:border-[var(--color-accent)]"
              placeholder="Необов'язкова нотатка"
            />
          </div>

          <div class="flex gap-3">
            <div class="flex-1">
              <label class="mb-1.5 block text-sm text-secondary">Статус</label>
              <select
                v-model="status"
                class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-base outline-none focus:border-[var(--color-accent)]"
              >
                <option v-for="s in TASK_STATUSES" :key="s" :value="s">{{ getStatusLabel(s) }}</option>
              </select>
            </div>

            <div class="flex-1">
              <label class="mb-1.5 block text-sm text-secondary">Проєкт</label>
              <select
                v-model="projectId"
                class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-base outline-none focus:border-[var(--color-accent)]"
              >
                <option :value="null">Без проєкту</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div><label class="mb-1.5 block text-sm text-secondary">Пріоритет</label><select v-model="priority" class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 outline-none"><option value="low">Низький</option><option value="medium">Середній</option><option value="high">Високий</option><option value="urgent">Терміновий</option></select></div>
            <div><label class="mb-1.5 block text-sm text-secondary">Дедлайн</label><input v-model="dueDate" type="date" class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 outline-none"></div>
            <div><label class="mb-1.5 block text-sm text-secondary">Повторення</label><select v-model="recurrence" class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 outline-none"><option :value="null">Не повторювати</option><option value="daily">Щодня</option><option value="weekly">Щотижня</option><option value="monthly">Щомісяця</option></select></div>
            <div><label class="mb-1.5 block text-sm text-secondary">Теги</label><input v-model="tags" placeholder="робота, дизайн" class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 outline-none"></div>
          </div>
          <div v-if="task" class="grid gap-3 border-t border-black/10 pt-3 sm:grid-cols-2">
            <div><label class="mb-2 block text-sm text-secondary">Підзадачі</label><div class="space-y-2"><label v-for="item in subtasks" :key="item.id" class="flex items-center gap-2 text-sm"><input :checked="item.done" type="checkbox" class="accent-[var(--color-accent)]" @change="toggleSubtask(item)"><span :class="item.done ? 'line-through text-secondary' : ''">{{ item.title }}</span></label></div><div class="mt-2 flex gap-2"><input v-model="newSubtask" class="min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm" placeholder="Нова підзадача" @keyup.enter="addSubtask"><button class="rounded-lg border border-black/10 px-3" @click="addSubtask"><UIcon name="i-lucide-plus"/></button></div></div>
            <div><label class="mb-2 block text-sm text-secondary">Коментарі</label><div class="max-h-32 space-y-2 overflow-y-auto"><div v-for="comment in comments" :key="comment.id" class="rounded-lg bg-black/[0.03] p-2 text-sm"><p>{{ comment.body }}</p><span class="text-xs text-secondary">{{ comment.authorName }}</span></div></div><div class="mt-2 flex gap-2"><input v-model="newComment" class="min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm" placeholder="Коментар" @keyup.enter="addComment"><button class="rounded-lg border border-black/10 px-3" @click="addComment"><UIcon name="i-lucide-send"/></button></div></div>
          </div>
        </div>

        <div class="mt-7 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg px-4 py-2.5 text-base text-secondary hover:text-black"
            @click="emit('close')"
          >
            Скасувати
          </button>
          <button
            type="button"
            class="rounded-full px-5 py-2.5 text-base font-medium"
            style="background-color: var(--color-accent); color: #ffffff"
            @click="submit"
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
