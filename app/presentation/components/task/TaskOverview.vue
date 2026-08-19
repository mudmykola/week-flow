<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Subtask, Task, UpdateTaskInput } from '~/domain/entities/task'
import { taskHealth, taskNextAction, taskTimeProgress } from '~/domain/services/taskGuidance'

const props = defineProps<{ task: Task; subtasks: Subtask[]; projects: Project[]; assignees: AssignableUser[] }>()
const emit = defineEmits<{ edit: []; patch: [value: UpdateTaskInput] }>()
const health = computed(() => taskHealth(props.task, props.subtasks))
const guidance = computed(() => taskNextAction(props.task, props.subtasks))
const time = computed(() => taskTimeProgress(props.task))
const project = computed(() => props.projects.find((item) => item.id === props.task.projectId))
const assignee = computed(() => props.assignees.find((item) => item.id === props.task.assigneeId))
const reviewer = computed(() => props.assignees.find((item) => item.id === props.task.reviewerId))
</script>

<template>
  <div class="task-overview space-y-4">
    <section class="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-secondary mb-1 text-xs">{{ $t('task.readMode') }}</p>
          <h2 class="text-2xl font-bold break-words">{{ task.title }}</h2>
          <p
            v-if="task.note"
            class="text-secondary mt-3 text-sm whitespace-pre-wrap"
          >
            {{ task.note }}
          </p>
          <p
            v-else
            class="text-secondary mt-3 text-sm"
          >
            {{ $t('task.noDescription') }}
          </p>
        </div>
        <AppButton
          icon="i-lucide-pencil"
          @click="emit('edit')"
          >{{ $t('common.edit') }}</AppButton
        >
      </div>
    </section>
    <TaskWorkLogComposer
      :task-id="task.id"
      :subtasks="subtasks"
    />
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section class="rounded-2xl border border-[var(--color-panel-border)] p-4">
        <p class="text-secondary text-xs">{{ $t('task.nextAction') }}</p>
        <div class="mt-2 flex items-center gap-3">
          <span
            class="grid size-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            ><UIcon :name="guidance.icon"
          /></span>
          <div>
            <strong>{{ $t(guidance.label) }}</strong>
            <p
              v-if="guidance.detail"
              class="text-secondary text-xs"
            >
              {{ guidance.detail }}
            </p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <AppButton
            v-if="task.status === 'todo'"
            size="sm"
            icon="i-lucide-play"
            @click="emit('patch', { status: 'in_progress', workState: 'active' })"
            >{{ $t('task.start') }}</AppButton
          >
          <AppButton
            v-if="task.status !== 'done'"
            size="sm"
            variant="ghost"
            icon="i-lucide-circle-check-big"
            @click="emit('patch', { status: 'done' })"
            >{{ $t('task.complete') }}</AppButton
          >
          <AppButton
            v-if="task.workState !== 'waiting'"
            size="sm"
            variant="ghost"
            icon="i-lucide-hourglass"
            @click="emit('patch', { workState: 'waiting' })"
            >{{ $t('task.markWaiting') }}</AppButton
          >
          <AppButton
            v-if="task.workState !== 'review'"
            size="sm"
            variant="ghost"
            icon="i-lucide-scan-search"
            @click="emit('patch', { workState: 'review' })"
            >{{ $t('task.requestReview') }}</AppButton
          >
        </div>
      </section>
      <section class="rounded-2xl border border-[var(--color-panel-border)] p-4">
        <div class="flex items-center justify-between">
          <strong>{{ $t('task.health') }}</strong
          ><span
            class="text-xl font-bold"
            :class="health.score < 60 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'"
            >{{ health.score }}</span
          >
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
          <div
            class="h-full bg-[var(--color-accent)]"
            :style="{ width: `${health.score}%` }"
          />
        </div>
        <ul
          v-if="health.issues.length"
          class="text-secondary mt-3 space-y-1 text-xs"
        >
          <li
            v-for="issue in health.issues"
            :key="issue"
          >
            • {{ $t(`task.healthIssue.${issue}`) }}
          </li>
        </ul>
        <p
          v-else
          class="text-secondary mt-3 text-xs"
        >
          {{ $t('task.healthReady') }}
        </p>
      </section>
    </div>
    <section class="grid gap-3 rounded-2xl border border-[var(--color-panel-border)] p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p class="text-secondary text-xs">{{ $t('task.status') }}</p>
        <strong>{{ $t(`task.statusValue.${task.status}`) }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.project') }}</p>
        <strong>{{ project?.name || $t('task.noProject') }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.assignee') }}</p>
        <strong>{{ assignee?.name || $t('task.unassigned') }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.workState') }}</p>
        <strong>{{ $t(`task.workStateValue.${task.workState}`) }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.plannedDate') }}</p>
        <strong>{{ task.plannedDate || '—' }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.deadline') }}</p>
        <strong>{{ task.dueDate || '—' }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.timeProgress') }}</p>
        <strong>{{ time.actual }} / {{ time.estimate || '—' }} {{ $t('task.minuteShort') }}</strong>
      </div>
      <div>
        <p class="text-secondary text-xs">{{ $t('task.reviewer') }}</p>
        <strong>{{ reviewer?.name || '—' }}</strong>
      </div>
    </section>
    <div
      v-if="task.waitingFor || task.reviewNote"
      class="grid gap-3 sm:grid-cols-2"
    >
      <section
        v-if="task.waitingFor"
        class="rounded-2xl border border-[var(--color-panel-border)] p-4"
      >
        <strong>{{ $t('task.waitingFor') }}</strong>
        <p class="text-secondary mt-1 text-sm">{{ task.waitingFor }}</p>
      </section>
      <section
        v-if="task.reviewNote"
        class="rounded-2xl border border-[var(--color-panel-border)] p-4"
      >
        <strong>{{ $t('task.reviewNote') }}</strong>
        <p class="text-secondary mt-1 text-sm">{{ task.reviewNote }}</p>
      </section>
    </div>
  </div>
</template>
