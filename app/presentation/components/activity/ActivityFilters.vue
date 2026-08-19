<script setup lang="ts">
import type { ActivityFiltersState } from '~/application/composables/useActivityFeed'

const props = defineProps<{
  modelValue: ActivityFiltersState
  actors: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ActivityFiltersState] }>()
const advancedOpen = ref(false)
const activeAdvanced = computed(
  () => [props.modelValue.actor, props.modelValue.project, props.modelValue.entity].filter(Boolean).length
)
function update(key: keyof ActivityFiltersState, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <section class="activity-filters surface-card">
    <div class="activity-filters__primary">
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
        <option value="subtask.updated">{{ $t('activityActions.subtask.updated') }}</option>
        <option value="subtask.completed">{{ $t('activityActions.subtask.completed') }}</option>
        <option value="comment.created">{{ $t('activityActions.comment.created') }}</option>
        <option value="goal.created">{{ $t('activityActions.goal.created') }}</option>
        <option value="goal.progress_updated">{{ $t('activityActions.goal.progress_updated') }}</option>
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
      <AppButton
        variant="secondary"
        icon="i-lucide-sliders-horizontal"
        @click="advancedOpen = !advancedOpen"
      >
        {{ $t('pages.activity.filters')
        }}<span
          v-if="activeAdvanced"
          class="count-badge"
          >{{ activeAdvanced }}</span
        >
      </AppButton>
    </div>
    <div
      v-if="advancedOpen"
      class="activity-filters__advanced"
    >
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
    </div>
  </section>
</template>

<style scoped>
.activity-filters {
  padding: 0.55rem;
  margin-top: 0.65rem;
}
.activity-filters__primary {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(9rem, 12rem) minmax(8rem, 10rem) auto;
  gap: 0.4rem;
}
.activity-filters__advanced {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--color-panel-border);
}
@media (max-width: 850px) {
  .activity-filters__primary {
    grid-template-columns: 1fr 1fr;
  }
  .activity-filters__search {
    grid-column: 1 / -1;
  }
}
@media (max-width: 560px) {
  .activity-filters__primary,
  .activity-filters__advanced {
    grid-template-columns: 1fr;
  }
}
</style>
