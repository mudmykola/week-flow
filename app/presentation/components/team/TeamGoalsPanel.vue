<script setup lang="ts">
import type { Goal, GoalPriority, UpdateGoalInput } from '~/domain/entities/goal'
import type { Project } from '~/domain/entities/project'

defineProps<{
  goals: Goal[]
  selectedIds: string[]
  assignees: Array<{ id: string; name: string }>
  projects: Project[]
  bulkDeadline: string
  bulkSaving: boolean
  assigneeName: (id: string | null) => string
}>()
defineEmits<{
  'update:selectedIds': [value: string[]]
  'update:bulkDeadline': [value: string]
  toggleAll: []
  bulk: [patch: UpdateGoalInput]
  deleteSelected: []
  edit: [goal: Goal]
  duplicate: [id: string]
  progress: [id: string, value: number]
  linkProject: [id: string, projectId: string | null]
}>()
</script>

<template>
  <article class="team-goals-panel section-card">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <input
          v-if="goals.length"
          type="checkbox"
          :checked="selectedIds.length === goals.length"
          :aria-label="$t('pages.team.selectAllGoals')"
          @change="$emit('toggleAll')"
        />
        <h2 class="font-display">{{ $t('pages.team.goals') }}</h2>
        <span class="count-badge">{{ goals.length }}</span>
      </div>
      <span
        v-if="selectedIds.length"
        class="text-secondary text-xs"
        >{{ $t('pages.team.selectedGoals', { count: selectedIds.length }) }}</span
      >
    </div>
    <div
      v-if="selectedIds.length"
      class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-2"
    >
      <select
        class="h-9 min-w-36 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2 text-xs"
        :aria-label="$t('pages.team.bulkAssignee')"
        :disabled="bulkSaving"
        @change="
          $emit('bulk', {
            assigneeId:
              ($event.target as HTMLSelectElement).value === '__team__'
                ? null
                : ($event.target as HTMLSelectElement).value
          })
        "
      >
        <option
          value=""
          disabled
          selected
        >
          {{ $t('pages.team.bulkAssignee') }}
        </option>
        <option value="__team__">{{ $t('pages.team.teamGoal') }}</option>
        <option
          v-for="member in assignees"
          :key="member.id"
          :value="member.id"
        >
          {{ member.name }}
        </option>
      </select>
      <select
        class="h-9 min-w-32 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2 text-xs"
        :aria-label="$t('pages.team.priority')"
        :disabled="bulkSaving"
        @change="$emit('bulk', { priority: ($event.target as HTMLSelectElement).value as GoalPriority })"
      >
        <option
          value=""
          disabled
          selected
        >
          {{ $t('pages.team.priority') }}
        </option>
        <option value="low">{{ $t('task.priorityValue.low') }}</option>
        <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
        <option value="high">{{ $t('task.priorityValue.high') }}</option>
      </select>
      <UButton
        size="sm"
        variant="soft"
        icon="i-lucide-circle-check"
        :loading="bulkSaving"
        @click="$emit('bulk', { status: 'done' })"
        >{{ $t('common.done') }}</UButton
      >
      <div class="flex items-center gap-1">
        <input
          :value="bulkDeadline"
          type="date"
          class="h-9 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2 text-xs"
          :aria-label="$t('pages.team.deadline')"
          @input="$emit('update:bulkDeadline', ($event.target as HTMLInputElement).value)"
        />
        <IconButton
          icon="i-lucide-calendar-check"
          :label="$t('pages.team.applyDeadline')"
          size="sm"
          :disabled="!bulkDeadline || bulkSaving"
          @click="$emit('bulk', { dueDate: bulkDeadline })"
        />
      </div>
      <IconButton
        class="ml-auto"
        icon="i-lucide-trash-2"
        :label="$t('pages.team.deleteSelected')"
        variant="ghost"
        size="sm"
        @click="$emit('deleteSelected')"
      />
    </div>
    <EmptyState
      v-if="!goals.length"
      :title="$t('pages.team.goalsEmpty')"
      :description="$t('pages.team.goalsEmptyHint')"
      icon="i-lucide-target"
    />
    <div
      v-else
      class="space-y-2"
    >
      <div
        v-for="item in goals"
        :key="item.id"
        class="group rounded-lg border border-[var(--color-panel-border)] p-3 transition hover:border-[var(--color-accent)]/40"
      >
        <div class="flex items-start justify-between gap-3">
          <input
            type="checkbox"
            :checked="selectedIds.includes(item.id)"
            :aria-label="$t('pages.team.selectGoal', { title: item.title })"
            @change="
              $emit(
                'update:selectedIds',
                ($event.target as HTMLInputElement).checked
                  ? [...selectedIds, item.id]
                  : selectedIds.filter((id) => id !== item.id)
              )
            "
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold">{{ item.title }}</p>
              <SemanticBadge
                :tone="item.priority === 'high' ? 'danger' : item.priority === 'low' ? 'info' : 'warning'"
                size="sm"
                >{{ $t(`task.priorityValue.${item.priority}`) }}</SemanticBadge
              >
            </div>
            <p class="text-secondary mt-0.5 text-xs">
              {{ assigneeName(item.assigneeId)
              }}<span v-if="item.dueDate"> · {{ $t('pages.team.due', { date: item.dueDate }) }}</span>
            </p>
            <div
              v-if="item.labels?.length"
              class="mt-2 flex flex-wrap gap-1"
            >
              <SemanticBadge
                v-for="label in item.labels"
                :key="label"
                tone="violet"
                size="sm"
                >{{ label }}</SemanticBadge
              >
            </div>
          </div>
          <div class="flex items-center gap-1">
            <strong class="text-sm text-[var(--color-accent)]">{{ item.progress }}%</strong>
            <IconButton
              icon="i-lucide-pencil"
              :label="$t('common.edit')"
              variant="ghost"
              size="sm"
              @click="$emit('edit', item)"
            />
            <IconButton
              icon="i-lucide-copy"
              :label="$t('common.duplicate')"
              variant="ghost"
              size="sm"
              @click="$emit('duplicate', item.id)"
            />
          </div>
        </div>
        <div
          v-if="item.projectId"
          class="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]"
        >
          <div
            class="h-full rounded-full"
            :style="{ width: `${item.progress}%`, backgroundColor: 'var(--color-accent)' }"
          />
        </div>
        <input
          v-else
          :value="item.progress"
          type="range"
          min="0"
          max="100"
          step="10"
          class="mt-3 w-full accent-[var(--color-accent)]"
          @change="$emit('progress', item.id, Number(($event.target as HTMLInputElement).value))"
        />
        <select
          :value="item.projectId"
          class="mt-2 h-8 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 text-xs"
          @change="$emit('linkProject', item.id, ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">{{ $t('pages.team.noLinkedProject') }}</option>
          <option
            v-for="project in projects"
            :key="project.id"
            :value="project.id"
          >
            {{ $t('pages.team.linkProject', { project: project.name }) }}
          </option>
        </select>
      </div>
    </div>
  </article>
</template>
