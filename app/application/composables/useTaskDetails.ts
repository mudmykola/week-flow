import type { Subtask, Task } from '~/domain/entities/task'

export interface TaskComment {
  id: string
  body: string
  authorName: string
  authorAvatar?: string | null
  createdAt: number
}

export interface TaskActivityItem {
  id: string
  action: string
  metadata: Record<string, unknown>
  actorName: string
  createdAt: number
}

export function useTaskDetails(task: Ref<Task | null>) {
  const subtasks = ref<Subtask[]>([])
  const comments = ref<TaskComment[]>([])
  const activity = ref<TaskActivityItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    if (!task.value) {
      subtasks.value = []
      comments.value = []
      activity.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      const details = await $fetch<{
        subtasks: Subtask[]
        comments: TaskComment[]
        activity: TaskActivityItem[]
      }>(`/api/tasks/${task.value.id}/details`)
      subtasks.value = details.subtasks
      comments.value = details.comments
      activity.value = details.activity
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Load failed'
    } finally {
      loading.value = false
    }
  }

  watch(() => task.value?.id, load, { immediate: true })
  return { subtasks, comments, activity, loading, error, load }
}
