<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser } from '~/domain/entities/task'
import type { InboxDestination, InboxItem } from '~/domain/entities/inbox'

defineProps<{
  open: boolean
  current: InboxItem | null
  index: number
  total: number
  projects: Project[]
  assignees: AssignableUser[]
  projectId: string | null
  assigneeId: string | null
  plannedDate: string
}>()
defineEmits<{
  close: []
  resolve: [item: InboxItem, destination: InboxDestination]
  tomorrow: []
  'update:projectId': [value: string | null]
  'update:assigneeId': [value: string | null]
  'update:plannedDate': [value: string]
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="inbox-processor inbox-process"
      role="dialog"
      aria-modal="true"
    >
      <header>
        <div>
          <span>{{ $t('pages.inbox.processMode') }}</span
          ><strong>{{ index + 1 }} / {{ total }}</strong>
        </div>
        <IconButton
          icon="i-lucide-x"
          :label="$t('common.close')"
          @click="$emit('close')"
        />
      </header>
      <main v-if="current">
        <p>{{ current.content }}</p>
        <div class="inbox-process__fields">
          <FormSelect
            :model-value="projectId"
            :aria-label="$t('task.project')"
            @update:model-value="$emit('update:projectId', ($event as string | null) ?? null)"
            ><option :value="null">{{ $t('task.noProject') }}</option>
            <option
              v-for="project in projects"
              :key="project.id"
              :value="project.id"
            >
              {{ project.name }}
            </option></FormSelect
          ><FormSelect
            :model-value="assigneeId"
            :aria-label="$t('task.assignee')"
            @update:model-value="$emit('update:assigneeId', ($event as string | null) ?? null)"
            ><option :value="null">{{ $t('task.unassigned') }}</option>
            <option
              v-for="person in assignees"
              :key="person.id"
              :value="person.id"
            >
              {{ person.name }}
            </option></FormSelect
          ><FormInput
            :model-value="plannedDate"
            type="date"
            :aria-label="$t('task.plannedDate')"
            @update:model-value="$emit('update:plannedDate', String($event ?? ''))"
          /><button @click="$emit('tomorrow')">{{ $t('pages.inbox.tomorrow') }}</button>
        </div>
        <div class="inbox-process__choices">
          <button
            v-for="choice in [
              ['today', '1', 'i-lucide-sun', 'pages.inbox.toToday'],
              ['task', '2', 'i-lucide-square-check-big', 'pages.inbox.toTask'],
              ['sticky', '3', 'i-lucide-sticky-note', 'pages.inbox.toSticky'],
              ['project', '4', 'i-lucide-folder-plus', 'pages.inbox.toProject'],
              ['goal', '5', 'i-lucide-target', 'pages.inbox.toGoal']
            ] as const"
            :key="choice[0]"
            @click="$emit('resolve', current, choice[0])"
          >
            <kbd>{{ choice[1] }}</kbd
            ><UIcon :name="choice[2]" />{{ $t(choice[3]) }}
          </button>
        </div>
      </main>
      <EmptyState
        v-else
        :title="$t('pages.inbox.empty')"
        :description="$t('pages.inbox.emptyHint')"
        icon="i-lucide-party-popper"
      />
    </div>
  </Teleport>
</template>
