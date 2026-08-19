<script setup lang="ts">
import type { ReviewProgressKind, ReviewTask, ReviewTaskJournal } from '~/domain/entities/review'

const props = defineProps<{
  journals: ReviewTaskJournal[]
  tasks: ReviewTask[]
  availableTasks: ReviewTask[]
  subtasks: Array<{
    id: string
    taskId: string
    title: string
    status: string
    plannedDate: string | null
    rescheduleCount: number
  }>
  canEdit: boolean
  saving?: boolean
}>()
const emit = defineEmits<{
  create: [
    input: {
      taskId: string
      subtaskId: string | null
      kind: ReviewProgressKind
      note: string
      minutes: number | null
      nextStep: string | null
    }
  ]
  update: [
    id: string,
    patch: { kind: ReviewProgressKind; note: string; minutes: number | null; nextStep: string | null }
  ]
  delete: [id: string]
  open: [task: ReviewTask]
}>()
const addedIds = ref<string[]>([])
const selectedTask = ref<string | null>(null)
const visibleJournals = computed(() => {
  const journalMap = new Map(props.journals.map((item) => [item.task.id, item]))
  const taskMap = new Map(
    [...props.tasks, ...props.availableTasks.filter((task) => addedIds.value.includes(task.id))].map((task) => [
      task.id,
      task
    ])
  )
  return [...taskMap.values()].map(
    (task) =>
      journalMap.get(task.id) ||
      ({
        task,
        entries: [],
        historyEntries: [],
        activeDays: 0,
        completedSubtasks: [],
        activity: [],
        focusMinutes: 0
      } satisfies ReviewTaskJournal)
  )
})
const addableTasks = computed(() =>
  props.availableTasks.filter((task) => !visibleJournals.value.some((journal) => journal.task.id === task.id))
)
function addTask() {
  if (!selectedTask.value) return
  addedIds.value.push(selectedTask.value)
  selectedTask.value = null
}
</script>

<template>
  <section class="review-task-timeline">
    <header class="review-task-timeline__header">
      <div>
        <h2><UIcon name="i-lucide-rows-3" />{{ $t('pages.review.progress.timelineTitle') }}</h2>
        <p>{{ $t('pages.review.progress.timelineHint') }}</p>
      </div>
      <form
        v-if="canEdit && addableTasks.length"
        @submit.prevent="addTask"
      >
        <FormSelect
          v-model="selectedTask"
          :placeholder="$t('pages.review.progress.addTask')"
          ><option
            v-for="task in addableTasks"
            :key="task.id"
            :value="task.id"
          >
            {{ task.title }}
          </option></FormSelect
        ><IconButton
          type="submit"
          icon="i-lucide-plus"
          :label="$t('pages.review.progress.addTask')"
          :disabled="!selectedTask"
        />
      </form>
    </header>
    <div
      v-if="visibleJournals.length"
      class="review-task-timeline__list"
    >
      <ReviewTaskJournalCard
        v-for="journal in visibleJournals"
        :key="journal.task.id"
        :journal="journal"
        :subtasks="subtasks.filter((item) => item.taskId === journal.task.id)"
        :can-edit="canEdit"
        :saving="saving"
        @create="emit('create', $event)"
        @update="(id, patch) => emit('update', id, patch)"
        @delete="emit('delete', $event)"
        @open="emit('open', journal.task)"
      />
    </div>
    <EmptyState
      v-else
      :title="$t('pages.review.progress.empty')"
      :description="$t('pages.review.progress.emptyHint')"
      icon="i-lucide-notebook-pen"
    />
  </section>
</template>

<style scoped>
.review-task-timeline {
  min-width: 0;
}
.review-task-timeline__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}
.review-task-timeline__header h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 800;
}
.review-task-timeline__header p {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.review-task-timeline__header form {
  display: grid;
  grid-template-columns: minmax(11rem, 18rem) auto;
  gap: 0.35rem;
}
.review-task-timeline__list {
  display: grid;
  gap: 0.55rem;
}
@media (max-width: 650px) {
  .review-task-timeline__header {
    align-items: stretch;
    flex-direction: column;
  }
  .review-task-timeline__header form {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
