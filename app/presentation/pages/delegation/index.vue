<script setup lang="ts">
import type { AssignableUser, Task } from '~/domain/entities/task'

const { user } = useUserSession()
const projectsStore = useProjectsStore()
const { data: tasks, status, refresh } = await useFetch<Task[]>('/api/tasks')
const { data: assignees } = await useFetch<AssignableUser[]>('/api/users/assignable')
const selected = ref<Task | null>(null)
const groups = computed(() => [
  {
    key: 'review',
    icon: 'i-lucide-scan-search',
    tasks: (tasks.value ?? []).filter((task) => task.reviewerId === user.value?.id && task.workState === 'review')
  },
  {
    key: 'assigned',
    icon: 'i-lucide-user-check',
    tasks: (tasks.value ?? []).filter((task) => task.assigneeId === user.value?.id && task.ownerId !== user.value?.id)
  },
  {
    key: 'delegated',
    icon: 'i-lucide-send',
    tasks: (tasks.value ?? []).filter(
      (task) => task.ownerId === user.value?.id && task.assigneeId && task.assigneeId !== user.value?.id
    )
  },
  {
    key: 'waiting',
    icon: 'i-lucide-hourglass',
    tasks: (tasks.value ?? []).filter((task) => task.workState === 'waiting')
  }
])
onMounted(() => {
  if (!projectsStore.projects.length) void projectsStore.loadProjects()
})
function updateTask(value: Task) {
  if (tasks.value) tasks.value = tasks.value.map((item) => (item.id === value.id ? value : item))
  selected.value = value
}
</script>

<template>
  <div class="delegation-page app-container max-w-7xl">
    <PageHeader
      :title="$t('nav.delegation')"
      :description="$t('pages.delegation.description')"
      icon="i-lucide-git-pull-request-arrow"
    />
    <USkeleton
      v-if="status === 'pending'"
      class="h-64 rounded-xl"
    />
    <div
      v-else
      class="grid gap-4 lg:grid-cols-2"
    >
      <section
        v-for="group in groups"
        :key="group.key"
        class="surface-card p-4"
      >
        <div class="mb-3 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-semibold">
            <UIcon :name="group.icon" />{{ $t(`pages.delegation.${group.key}`) }}
          </h2>
          <span class="count-badge">{{ group.tasks.length }}</span>
        </div>
        <BoundedTaskList
          v-if="group.tasks.length"
          :count="group.tasks.length"
          :preview="5"
          :row-height="66"
          :storage-key="`delegation-${group.key}`"
        >
          <div class="space-y-2">
            <button
              v-for="task in group.tasks"
              :key="task.id"
              type="button"
              class="flex w-full items-center justify-between rounded-xl border border-[var(--color-panel-border)] p-3 text-left hover:border-[var(--color-accent)]"
              @click="selected = task"
            >
              <span class="min-w-0"
                ><strong class="block truncate text-sm">{{ task.title }}</strong
                ><span class="text-secondary text-xs">{{
                  task.plannedDate || task.dueDate || $t('task.noDate')
                }}</span></span
              ><UIcon name="i-lucide-chevron-right" />
            </button>
          </div>
        </BoundedTaskList>
        <p
          v-else
          class="text-secondary py-6 text-center text-sm"
        >
          {{ $t('pages.delegation.empty') }}
        </p>
      </section>
    </div>
    <TaskEditor
      :open="Boolean(selected)"
      :task="selected"
      :projects="projectsStore.projects"
      :assignees="assignees ?? []"
      @close="selected = null"
      @updated="updateTask"
      @promoted="() => refresh()"
    />
  </div>
</template>
