<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import { fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'
import { priorityLabels } from '~/domain/services/taskLabels'

const props = defineProps<{ mode: 'today' | 'upcoming' | 'overdue' | 'archive'; title: string; icon: string }>()
const tasks = ref<Task[]>([])
const loading = ref(true)
const today = new Date().toISOString().slice(0, 10)

const visibleTasks = computed(() =>
  tasks.value
    .filter((task) => {
      if (props.mode === 'archive') return Boolean(task.archivedAt)
      if (task.archivedAt) return false
      if (props.mode === 'today') return task.dueDate === today
      if (props.mode === 'upcoming') return Boolean(task.dueDate && task.dueDate > today)
      return Boolean(task.dueDate && task.dueDate < today && task.status !== 'done')
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
)

onMounted(async () => {
  try {
    tasks.value = await fetchAllTasks()
  } finally {
    loading.value = false
  }
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
  <div class="task-list-view app-container max-w-5xl">
    <PageHeader
      :title="title"
      :icon="icon"
      :count="visibleTasks.length"
    />
    <div
      v-if="loading"
      class="space-y-2"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-16 w-full rounded-xl"
      />
    </div>
    <div
      v-else-if="visibleTasks.length"
      class="space-y-3"
    >
      <article
        v-for="task in visibleTasks"
        :key="task.id"
        class="glass-card flex items-center gap-3 p-3"
      >
        <button
          :title="task.status === 'done' ? $t('taskActions.return') : $t('taskActions.complete')"
          @click="toggleDone(task)"
        >
          <UIcon
            :name="task.status === 'done' ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
            class="size-5"
            :class="task.status === 'done' ? 'text-[var(--color-accent)]' : 'text-secondary'"
          />
        </button>
        <div class="min-w-0 flex-1">
          <p
            class="truncate font-medium"
            :class="task.status === 'done' ? 'text-secondary line-through' : ''"
          >
            {{ task.title }}
          </p>
          <div class="text-secondary mt-1 flex flex-wrap gap-2 text-xs">
            <span v-if="task.dueDate">{{ task.dueDate }}</span
            ><span>{{ priorityLabels[task.priority] }}</span
            ><span
              v-for="tag in task.tags"
              :key="tag"
              >#{{ tag }}</span
            >
          </div>
        </div>
        <button
          :title="task.archivedAt ? $t('taskActions.restore') : $t('taskActions.archive')"
          @click="toggleArchive(task)"
        >
          <UIcon
            :name="task.archivedAt ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
            class="text-secondary size-4"
          />
        </button>
      </article>
    </div>
    <EmptyState
      v-else
      :title="$t('taskActions.empty')"
      :description="$t('taskActions.emptyHint')"
      :icon="icon"
    />
  </div>
</template>
