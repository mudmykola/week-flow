<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import type { AutomationExecution } from '~/domain/entities/workflow'

defineProps<{
  executions: AutomationExecution[]
  tasks: Task[]
  projectId: string | null
  testTaskId: string
  testResult: { matches: boolean; changes: Record<string, unknown>; sideEffects: unknown[] } | null
}>()
const emit = defineEmits<{ 'update:testTaskId': [value: string]; openTask: [taskId: string] }>()
</script>

<template>
  <AppSurface class="workflow-execution-history workflow-panel">
    <header class="workflow-panel__header">
      <div>
        <h2 class="font-display">{{ $t('pages.workflows.executionLog') }}</h2>
        <p class="text-secondary text-xs">{{ $t('pages.workflows.executionLogHint') }}</p>
      </div>
      <FormSelect
        :model-value="testTaskId"
        class="max-w-64"
        @update:model-value="emit('update:testTaskId', String($event))"
      >
        <option value="">{{ $t('pages.workflows.chooseTestTask') }}</option>
        <option
          v-for="task in tasks.filter((item) => item.projectId === projectId)"
          :key="task.id"
          :value="task.id"
        >
          {{ task.title }}
        </option>
      </FormSelect>
    </header>
    <div
      v-if="testResult"
      class="automation-preview"
    >
      <UIcon name="i-lucide-flask-conical" />
      <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
    </div>
    <BoundedTaskList
      v-if="executions.length"
      :count="executions.length"
      :preview="7"
      :row-height="76"
      storage-key="workflow-history"
    >
      <div class="workflow-panel__list">
        <article
          v-for="entry in executions"
          :key="entry.id"
          class="automation-rule surface-card"
        >
          <SemanticBadge
            :tone="entry.status === 'success' ? 'success' : entry.status === 'failed' ? 'danger' : 'warning'"
            :icon="
              entry.status === 'success'
                ? 'i-lucide-circle-check'
                : entry.status === 'failed'
                  ? 'i-lucide-circle-x'
                  : 'i-lucide-skip-forward'
            "
            >{{ entry.status }}</SemanticBadge
          >
          <span class="automation-rule__icon">
            <UIcon
              :name="
                entry.status === 'success'
                  ? 'i-lucide-circle-check'
                  : entry.status === 'failed'
                    ? 'i-lucide-circle-x'
                    : 'i-lucide-skip-forward'
              "
            />
          </span>
          <div class="automation-rule__body">
            <p class="automation-rule__name">
              {{ entry.ruleName }} · {{ entry.taskTitle || $t('pages.workflows.deletedTask') }}
            </p>
            <p class="text-secondary text-xs">
              {{ entry.trigger }} · {{ new Date(entry.createdAt).toLocaleString() }} ·
              {{ entry.error || Object.keys(entry.changes).join(', ') }}
            </p>
          </div>
          <AppButton
            v-if="entry.taskId"
            size="sm"
            variant="ghost"
            icon="i-lucide-arrow-up-right"
            @click="emit('openTask', entry.taskId)"
            >{{ $t('pages.workflows.openTask') }}</AppButton
          >
        </article>
      </div>
    </BoundedTaskList>
    <EmptyState
      v-if="!executions.length"
      :title="$t('pages.workflows.noExecutions')"
      :description="$t('pages.workflows.noExecutionsHint')"
      icon="i-lucide-history"
    />
  </AppSurface>
</template>
