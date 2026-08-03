<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, TaskPriority, TaskRecurrence } from '~/domain/entities/task'
import { getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'

defineProps<{
  projects: Project[]
  assignees: AssignableUser[]
  stages: Array<{ id: string; name: string; category: Task['status'] }>
}>()
const status = defineModel<Task['status']>('status', { required: true })
const projectId = defineModel<string | null>('projectId', { required: true })
const assigneeId = defineModel<string | null>('assigneeId', { required: true })
const priority = defineModel<TaskPriority>('priority', { required: true })
const dueDate = defineModel<string>('dueDate', { required: true })
const stageId = defineModel<string | null>('stageId', { required: true })
const recurrence = defineModel<TaskRecurrence | null>('recurrence', { required: true })
</script>

<template>
  <aside
    class="task-properties space-y-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-alt)]/45 p-4"
  >
    <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
      <UIcon name="i-lucide-sliders-horizontal" />{{ $t('task.planning') }}
    </h3>
    <FormField
      :label="$t('task.status')"
      icon="i-lucide-circle-dashed"
    >
      <FormSelect v-model="status">
        <option
          v-for="item in TASK_STATUSES"
          :key="item"
          :value="item"
        >
          {{ $t(getStatusLabel(item)) }}
        </option>
      </FormSelect>
    </FormField>
    <FormField
      :label="$t('task.assignee')"
      icon="i-lucide-user-round"
    >
      <FormSelect v-model="assigneeId">
        <option :value="null">{{ $t('task.unassigned') }}</option>
        <option
          v-for="person in assignees"
          :key="person.id"
          :value="person.id"
        >
          {{ person.name }}
        </option>
      </FormSelect>
    </FormField>
    <FormField
      :label="$t('task.project')"
      icon="i-lucide-folder-kanban"
    >
      <FormSelect v-model="projectId">
        <option :value="null">{{ $t('task.noProject') }}</option>
        <option
          v-for="project in projects"
          :key="project.id"
          :value="project.id"
        >
          {{ project.name }}
        </option>
      </FormSelect>
    </FormField>
    <div class="grid grid-cols-2 gap-3">
      <FormField
        :label="$t('task.priority')"
        icon="i-lucide-flag"
      >
        <FormSelect v-model="priority">
          <option value="low">{{ $t('task.priorityValue.low') }}</option>
          <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
          <option value="high">{{ $t('task.priorityValue.high') }}</option>
          <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option>
        </FormSelect>
      </FormField>
      <FormField
        :label="$t('task.deadline')"
        icon="i-lucide-calendar-days"
      >
        <FormInput
          v-model="dueDate"
          type="date"
        />
      </FormField>
    </div>
    <details class="task-properties__advanced rounded-xl border border-[var(--color-panel-border)] p-3">
      <summary class="cursor-pointer text-xs font-semibold">{{ $t('task.advanced') }}</summary>
      <div class="mt-3 space-y-3">
        <FormField
          v-if="stages.length"
          :label="$t('task.workflowStage')"
          icon="i-lucide-git-branch"
        >
          <FormSelect v-model="stageId">
            <option :value="null">{{ $t('task.standardStatus') }}</option>
            <option
              v-for="stage in stages"
              :key="stage.id"
              :value="stage.id"
            >
              {{ stage.name }}
            </option>
          </FormSelect>
        </FormField>
        <FormField
          :label="$t('task.recurrence')"
          icon="i-lucide-repeat-2"
        >
          <FormSelect v-model="recurrence">
            <option :value="null">{{ $t('task.noRecurrence') }}</option>
            <option value="daily">{{ $t('task.recurrenceValue.daily') }}</option>
            <option value="weekly">{{ $t('task.recurrenceValue.weekly') }}</option>
            <option value="monthly">{{ $t('task.recurrenceValue.monthly') }}</option>
          </FormSelect>
        </FormField>
      </div>
    </details>
  </aside>
</template>
