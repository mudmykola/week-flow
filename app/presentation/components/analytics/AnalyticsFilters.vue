<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, TaskPriority } from '~/domain/entities/task'
import type { AnalyticsPeriod } from '~/domain/services/analytics'
import { priorityLabels } from '~/domain/services/taskLabels'

defineProps<{
  period: AnalyticsPeriod
  projectId: string | null
  assigneeId: string | null
  priority: TaskPriority | null
  projects: Project[]
  assignees: AssignableUser[]
  hasFilters: boolean
}>()
defineEmits<{
  'update:period': [value: AnalyticsPeriod]
  'update:projectId': [value: string | null]
  'update:assigneeId': [value: string | null]
  'update:priority': [value: TaskPriority | null]
  reset: []
}>()
</script>

<template>
  <section
    class="analytics-filters analytics-page__filters section-card mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
  >
    <UFormField :label="$t('pages.analytics.period')">
      <USelect
        :model-value="period"
        :items="[
          { label: $t('pages.analytics.eightWeeks'), value: '8w' },
          { label: $t('pages.analytics.allTime'), value: 'all' }
        ]"
        value-key="value"
        class="w-full"
        @update:model-value="$emit('update:period', $event as AnalyticsPeriod)"
      />
    </UFormField>
    <UFormField :label="$t('task.project')">
      <USelect
        :model-value="projectId"
        :items="[
          { label: $t('board.allProjects'), value: null },
          ...projects.map((project) => ({ label: project.name, value: project.id }))
        ]"
        value-key="value"
        class="w-full"
        @update:model-value="$emit('update:projectId', ($event as string | null) ?? null)"
      />
    </UFormField>
    <UFormField :label="$t('task.assignee')">
      <USelect
        :model-value="assigneeId"
        :items="[
          { label: $t('pages.analytics.allAssignees'), value: null },
          ...assignees.map((person) => ({ label: person.name, value: person.id }))
        ]"
        value-key="value"
        class="w-full"
        @update:model-value="$emit('update:assigneeId', ($event as string | null) ?? null)"
      />
    </UFormField>
    <UFormField :label="$t('task.priority')">
      <USelect
        :model-value="priority"
        :items="[
          { label: $t('board.allPriorities'), value: null },
          ...(['urgent', 'high', 'medium', 'low'] as const).map((value) => ({
            label: $t(priorityLabels[value]),
            value
          }))
        ]"
        value-key="value"
        class="w-full"
        @update:model-value="$emit('update:priority', ($event as TaskPriority | null) ?? null)"
      />
    </UFormField>
    <UButton
      v-if="hasFilters"
      class="self-end"
      variant="ghost"
      color="neutral"
      icon="i-lucide-filter-x"
      @click="$emit('reset')"
    >
      {{ $t('pages.analytics.reset') }}
    </UButton>
  </section>
</template>
