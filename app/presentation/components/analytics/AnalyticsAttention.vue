<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import { priorityLabels } from '~/domain/services/taskLabels'

defineProps<{ tasks: Task[]; overdueCount: number }>()
defineEmits<{ select: [task: Task] }>()
</script>

<template>
  <section class="analytics-attention analytics-page__attention section-card mt-4">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="font-display text-lg">{{ $t('pages.analytics.attention') }}</h2>
        <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.attentionHint') }}</p>
      </div>
      <UButton
        to="/overdue"
        size="sm"
        variant="soft"
        color="error"
        icon="i-lucide-triangle-alert"
      >
        {{ overdueCount }} {{ $t('pages.analytics.viewAll') }}
      </UButton>
    </div>
    <BoundedTaskList
      v-if="tasks.length"
      :count="tasks.length"
      :preview="6"
      :row-height="48"
      storage-key="analytics-attention"
    >
      <div class="divide-y divide-[var(--color-panel-border)]">
        <button
          v-for="task in tasks"
          :key="task.id"
          type="button"
          class="flex w-full items-center gap-3 py-3 text-left"
          @click="$emit('select', task)"
        >
          <PriorityBadge :priority="task.priority" />
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ task.title }}</span>
          <span class="text-secondary text-xs">{{ task.dueDate || $t(priorityLabels[task.priority]) }}</span>
          <UIcon
            name="i-lucide-chevron-right"
            class="text-secondary size-4"
          />
        </button>
      </div>
    </BoundedTaskList>
    <p
      v-else
      class="text-secondary py-8 text-center text-sm"
    >
      {{ $t('pages.analytics.underControl') }}
    </p>
  </section>
</template>
