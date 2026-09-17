<script setup lang="ts">
import { addDays, format } from 'date-fns'
import draggable from 'vuedraggable'
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, UpdateTaskInput } from '~/domain/entities/task'
import { weekToDate } from '~/domain/services/week'

export type BoardMode = 'status' | 'day' | 'assignee' | 'project' | 'priority'
type Lane = { id: string; title: string; icon: string; color?: string; patch: UpdateTaskInput; tasks: Task[] }
const props = defineProps<{
  tasks: Task[]
  week: string
  mode: BoardMode
  projects: Project[]
  assignees: AssignableUser[]
  selectedIds: string[]
  density: 'comfortable' | 'compact' | 'titles'
}>()
const emit = defineEmits<{
  edit: [task: Task]
  select: [id: string, selected: boolean]
  patch: [id: string, patch: UpdateTaskInput]
  quick: [input: string, patch: UpdateTaskInput]
  delete: [id: string]
  duplicate: [id: string]
}>()
const { t, locale } = useI18n()
const quickLane = ref<string | null>(null)
const quickTitle = ref('')
const mobileLane = ref(0)
const laneLists = ref<Record<string, Task[]>>({})

const lanes = computed<Lane[]>(() => {
  const unassigned = t('board.unassignedLane')
  if (props.mode === 'status')
    return [
      {
        id: 'todo',
        title: t('task.statusValue.todo'),
        icon: 'i-lucide-circle',
        patch: { status: 'todo' },
        tasks: props.tasks.filter((task) => task.status === 'todo')
      },
      {
        id: 'in_progress',
        title: t('task.statusValue.in_progress'),
        icon: 'i-lucide-loader-circle',
        patch: { status: 'in_progress' },
        tasks: props.tasks.filter((task) => task.status === 'in_progress')
      },
      {
        id: 'done',
        title: t('task.statusValue.done'),
        icon: 'i-lucide-circle-check-big',
        patch: { status: 'done' },
        tasks: props.tasks.filter((task) => task.status === 'done')
      }
    ]
  if (props.mode === 'day') {
    const start = weekToDate(props.week)
    const days = Array.from({ length: 7 }, (_, index) => {
      const value = format(addDays(start, index), 'yyyy-MM-dd')
      return {
        id: value,
        title: new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric' }).format(
          addDays(start, index)
        ),
        icon: 'i-lucide-calendar-days',
        patch: { plannedDate: value },
        tasks: props.tasks.filter((task) => task.plannedDate === value)
      }
    })
    return [
      {
        id: 'none',
        title: t('board.unplanned'),
        icon: 'i-lucide-calendar-x',
        patch: { plannedDate: null },
        tasks: props.tasks.filter((task) => !task.plannedDate)
      },
      ...days
    ]
  }
  if (props.mode === 'assignee')
    return [
      {
        id: 'none',
        title: unassigned,
        icon: 'i-lucide-user-x',
        patch: { assigneeId: null },
        tasks: props.tasks.filter((task) => !task.assigneeId)
      },
      ...props.assignees.map((person) => ({
        id: person.id,
        title: person.name,
        icon: 'i-lucide-user-round',
        patch: { assigneeId: person.id },
        tasks: props.tasks.filter((task) => task.assigneeId === person.id)
      }))
    ]
  if (props.mode === 'project')
    return [
      {
        id: 'none',
        title: t('task.noProject'),
        icon: 'i-lucide-folder-x',
        patch: { projectId: null },
        tasks: props.tasks.filter((task) => !task.projectId)
      },
      ...props.projects.map((project) => ({
        id: project.id,
        title: project.name,
        icon: 'i-lucide-folder',
        color: project.color,
        patch: { projectId: project.id },
        tasks: props.tasks.filter((task) => task.projectId === project.id)
      }))
    ]
  if (props.mode === 'priority')
    return (['urgent', 'high', 'medium', 'low'] as const).map((priority) => ({
      id: priority,
      title: t(`task.priorityValue.${priority}`),
      icon: 'i-lucide-flag',
      patch: { priority },
      tasks: props.tasks.filter((task) => task.priority === priority)
    }))
  return []
})

watch(
  lanes,
  (value) => {
    laneLists.value = Object.fromEntries(value.map((lane) => [lane.id, [...lane.tasks]]))
    if (mobileLane.value >= value.length) mobileLane.value = 0
  },
  { immediate: true, deep: true }
)
function moved(lane: Lane) {
  const list = laneLists.value[lane.id] || []
  list.forEach((task, sort) => emit('patch', task.id, { ...lane.patch, sort }))
}
function submit(lane: Lane) {
  if (!quickTitle.value.trim()) return
  emit('quick', quickTitle.value.trim(), lane.patch)
  quickTitle.value = ''
}
function project(task: Task) {
  return props.projects.find((item) => item.id === task.projectId) || null
}
function assignee(task: Task) {
  return props.assignees.find((item) => item.id === task.assigneeId)?.name || ''
}
function forwardSelect(id: string, selected: boolean) {
  emit('select', id, selected)
}
function forwardTitle(id: string, title: string) {
  emit('patch', id, { title })
}
function laneTone(lane: Lane) {
  if (lane.patch.status === 'done') return 'success'
  if (lane.patch.status === 'in_progress') return 'info'
  if (lane.patch.priority === 'urgent') return 'danger'
  if (lane.patch.priority === 'high') return 'attention'
  return 'neutral'
}
</script>

<template>
  <section class="week-board-v3">
    <nav
      class="week-board-v3__mobile-nav"
      :aria-label="$t('board.mobileLanes')"
    >
      <button
        v-for="(lane, index) in lanes"
        :key="lane.id"
        :class="{ 'week-board-v3__mobile-button--active': mobileLane === index }"
        @click="mobileLane = index"
      >
        <UIcon :name="lane.icon" />{{ lane.title }}<span>{{ laneLists[lane.id]?.length || 0 }}</span>
      </button>
    </nav>
    <div
      class="week-board-v3__lanes"
      :data-density="density"
    >
      <article
        v-for="(lane, index) in lanes"
        :key="lane.id"
        class="week-board-v3__lane"
        :class="{ 'week-board-v3__lane--mobile-active': mobileLane === index }"
      >
        <header>
          <SemanticDot
            :tone="laneTone(lane)"
            :label="lane.title"
          />
          <span>{{ laneLists[lane.id]?.length || 0 }}</span
          ><IconButton
            icon="i-lucide-plus"
            :label="$t('board.addTaskTo', { column: lane.title })"
            size="sm"
            @click="quickLane = lane.id"
          />
        </header>
        <BoundedTaskList
          :count="laneLists[lane.id]?.length || 0"
          :preview="density === 'comfortable' ? 4 : density === 'compact' ? 6 : 8"
          :row-height="density === 'comfortable' ? 112 : density === 'compact' ? 82 : 54"
          :storage-key="`board-${mode}-${lane.id}`"
        >
          <draggable
            v-model="laneLists[lane.id]"
            group="week-board-v3"
            item-key="id"
            class="week-board-v3__cards"
            ghost-class="week-board-v3__ghost"
            :scroll="true"
            :scroll-sensitivity="80"
            :scroll-speed="12"
            @change="moved(lane)"
          >
            <template #item="{ element: task }"
              ><TaskCard
                :task="task"
                :project="project(task)"
                :assignee-name="assignee(task)"
                :compact="density !== 'comfortable'"
                :hide-status="mode === 'status'"
                :selected="selectedIds.includes(task.id)"
                @edit="emit('edit', $event)"
                @cycle-status="
                  emit('patch', task.id, {
                    status: task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done'
                  })
                "
                @select="forwardSelect"
                @inline-title="forwardTitle"
                @delete="emit('delete', $event)"
                @duplicate="emit('duplicate', $event)"
            /></template>
          </draggable>
        </BoundedTaskList>
        <form
          v-if="quickLane === lane.id"
          class="week-board-v3__quick"
          @submit.prevent="submit(lane)"
        >
          <UIcon name="i-lucide-wand-sparkles" /><input
            v-model="quickTitle"
            autofocus
            :placeholder="$t('board.smartCreatePlaceholder')"
            @keydown.esc="quickLane = null"
          /><kbd>Enter</kbd>
        </form>
        <button
          v-else
          class="week-board-v3__add"
          @click="quickLane = lane.id"
        >
          <UIcon name="i-lucide-plus" />{{ $t('board.addTask') }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/week/week-board-v3.css"></style>
