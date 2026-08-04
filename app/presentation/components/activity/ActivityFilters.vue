<script setup lang="ts">
import type { ActivityFiltersState } from '~/application/composables/useActivityFeed'

const props = defineProps<{
  modelValue: ActivityFiltersState
  actors: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ActivityFiltersState] }>()
function update(key: keyof ActivityFiltersState, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <section
    class="activity-filters surface-card grid gap-2 p-3 md:grid-cols-3 xl:grid-cols-[minmax(14rem,1fr)_repeat(5,minmax(8rem,auto))]"
  >
    <div class="activity-filters__search relative">
      <UIcon
        name="i-lucide-search"
        class="text-secondary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <FormInput
        :model-value="modelValue.search"
        type="search"
        class="pl-9"
        :placeholder="$t('pages.activity.search')"
        @update:model-value="update('search', String($event))"
      />
    </div>
    <FormSelect
      :model-value="modelValue.action"
      @update:model-value="update('action', String($event))"
    >
      <option value="">{{ $t('pages.activity.allActions') }}</option>
      <option value="task.created">{{ $t('activityActions.task.created') }}</option>
      <option value="task.updated">{{ $t('activityActions.task.updated') }}</option>
      <option value="task.deleted">{{ $t('activityActions.task.deleted') }}</option>
      <option value="subtask.created">{{ $t('activityActions.subtask.created') }}</option>
      <option value="comment.created">{{ $t('activityActions.comment.created') }}</option>
      <option value="goal.created">{{ $t('activityActions.goal.created') }}</option>
      <option value="goal.progress_updated">{{ $t('activityActions.goal.progress_updated') }}</option>
      <option value="goal.project_linked">{{ $t('activityActions.goal.project_linked') }}</option>
      <option value="goal.project_unlinked">{{ $t('activityActions.goal.project_unlinked') }}</option>
    </FormSelect>
    <FormSelect
      :model-value="modelValue.actor"
      @update:model-value="update('actor', String($event))"
    >
      <option value="">{{ $t('pages.activity.allActors') }}</option>
      <option
        v-for="actor in actors"
        :key="actor.id"
        :value="actor.id"
      >
        {{ actor.name }}
      </option>
    </FormSelect>
    <FormSelect
      :model-value="modelValue.project"
      @update:model-value="update('project', String($event))"
    >
      <option value="">{{ $t('pages.activity.allProjects') }}</option>
      <option
        v-for="project in projects"
        :key="project.id"
        :value="project.id"
      >
        {{ project.name }}
      </option>
    </FormSelect>
    <FormSelect
      :model-value="modelValue.entity"
      @update:model-value="update('entity', String($event))"
    >
      <option value="">{{ $t('pages.activity.allEntities') }}</option>
      <option value="task">{{ $t('pages.activity.tasks') }}</option>
      <option value="project">{{ $t('pages.activity.projects') }}</option>
      <option value="goal">{{ $t('pages.activity.goals') }}</option>
    </FormSelect>
    <FormSelect
      :model-value="modelValue.period"
      @update:model-value="update('period', String($event))"
    >
      <option value="7">{{ $t('pages.activity.last7Days') }}</option>
      <option value="30">{{ $t('pages.activity.last30Days') }}</option>
      <option value="90">{{ $t('pages.activity.last90Days') }}</option>
      <option value="">{{ $t('pages.activity.allTime') }}</option>
    </FormSelect>
  </section>
</template>
