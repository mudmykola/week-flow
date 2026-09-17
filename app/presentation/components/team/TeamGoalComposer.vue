<script setup lang="ts">
import type { GoalPriority } from '~/domain/entities/goal'

export interface TeamGoalDraft {
  title: string
  description: string
  assigneeId: string | null
  dueDate: string
  priority: GoalPriority
  labelsInput: string
}

defineProps<{
  draft: TeamGoalDraft
  assignees: Array<{ id: string; name: string }>
  currentUserId?: string
  saving: boolean
}>()
defineEmits<{ create: [] }>()
</script>

<template>
  <aside class="team-goal-composer section-card h-fit">
    <h2 class="font-display">{{ $t('pages.team.newGoal') }}</h2>
    <div class="mt-3 space-y-3">
      <input
        v-model="draft.title"
        class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
        :placeholder="$t('pages.team.goalName')"
      /><textarea
        v-model="draft.description"
        rows="3"
        class="w-full resize-none rounded-lg border border-[var(--color-panel-border)] bg-transparent p-3"
        :placeholder="$t('pages.team.expected')"
      /><select
        v-model="draft.assigneeId"
        class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
      >
        <option :value="null">{{ $t('pages.team.teamGoal') }}</option>
        <option
          v-for="member in assignees"
          :key="member.id"
          :value="member.id"
        >
          {{ member.id === currentUserId ? $t('pages.team.assignToMe', { name: member.name }) : member.name }}
        </option>
      </select>
      <div class="grid grid-cols-2 gap-2">
        <select
          v-model="draft.priority"
          class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
          :aria-label="$t('pages.team.priority')"
        >
          <option value="low">{{ $t('task.priorityValue.low') }}</option>
          <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
          <option value="high">{{ $t('task.priorityValue.high') }}</option>
        </select>
        <input
          v-model="draft.dueDate"
          type="date"
          class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
          :aria-label="$t('pages.team.deadline')"
        />
      </div>
      <input
        v-model="draft.labelsInput"
        class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
        :placeholder="$t('pages.team.labelsPlaceholder')"
      />
      <p class="text-secondary text-xs">{{ $t('pages.team.labelsHint') }}</p>
      <UButton
        block
        :loading="saving"
        icon="i-lucide-target"
        @click="$emit('create')"
        >{{ $t('pages.team.createGoal') }}</UButton
      >
    </div>
  </aside>
</template>
