<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, TaskPriority, TaskStatus } from '~/domain/entities/task'
import type { CalendarFilters } from '~/application/composables/useCalendarFilters'

defineProps<{
  projects: Project[]
  assignees: AssignableUser[]
  priorities: TaskPriority[]
  statuses: TaskStatus[]
  hasFilters: boolean
}>()
const emit = defineEmits<{ clear: [] }>()
const filters = defineModel<CalendarFilters>('filters', { required: true })
</script>

<template>
  <section class="calendar-filters-bar calendar-filters surface-card">
    <FormSelect
      v-model="filters.projectId"
      :placeholder="$t('pages.calendar.allProjects')"
    >
      <option
        v-for="item in projects"
        :key="item.id"
        :value="item.id"
      >
        {{ item.name }}
      </option>
    </FormSelect>
    <FormSelect
      v-model="filters.assigneeId"
      :placeholder="$t('pages.calendar.allAssignees')"
    >
      <option
        v-for="person in assignees"
        :key="person.id"
        :value="person.id"
      >
        {{ person.name }}
      </option>
    </FormSelect>
    <FormSelect
      v-model="filters.priority"
      :placeholder="$t('pages.calendar.allPriorities')"
    >
      <option
        v-for="priority in priorities"
        :key="priority"
        :value="priority"
      >
        {{ $t(`task.priorityValue.${priority}`) }}
      </option>
    </FormSelect>
    <FormSelect
      v-model="filters.status"
      :placeholder="$t('pages.calendar.allStatuses')"
    >
      <option
        v-for="status in statuses"
        :key="status"
        :value="status"
      >
        {{ $t(`task.statusValue.${status}`) }}
      </option>
    </FormSelect>
    <IconButton
      v-if="hasFilters"
      icon="i-lucide-filter-x"
      :label="$t('pages.calendar.clearFilters')"
      @click="emit('clear')"
    />
  </section>
</template>
