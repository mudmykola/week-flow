<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import type { CalendarPlan } from '~/domain/services/calendar'

const props = defineProps<{ open: boolean; plan: CalendarPlan[]; tasks: Task[]; saving: boolean }>()
const emit = defineEmits<{ close: []; apply: [] }>()

function planTitle(taskId: string) {
  return props.tasks.find((item) => item.id === taskId)?.title
}
</script>

<template>
  <Modal
    class="calendar-smart-plan-modal"
    :open="open"
    :title="$t('pages.calendar.smartPreview')"
    @close="emit('close')"
  >
    <p class="text-secondary mb-3 text-sm">{{ $t('pages.calendar.smartPreviewHint') }}</p>
    <div
      v-if="plan.length"
      class="space-y-2"
    >
      <div
        v-for="item in plan"
        :key="item.taskId"
        class="flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] p-3 text-sm"
      >
        <UIcon
          name="i-lucide-wand-sparkles"
          class="text-[var(--color-accent)]"
        /><strong class="flex-1">{{ planTitle(item.taskId) }}</strong
        ><span class="text-secondary">{{ item.plannedDate }} · {{ item.plannedTime }}</span>
      </div>
    </div>
    <EmptyState
      v-else
      :title="$t('pages.calendar.nothingToPlan')"
      :description="$t('pages.calendar.nothingToPlanHint')"
      icon="i-lucide-circle-check"
    />
    <template #footer
      ><AppButton
        variant="ghost"
        @click="emit('close')"
        >{{ $t('common.cancel') }}</AppButton
      ><AppButton
        variant="primary"
        :disabled="!plan.length || saving"
        @click="emit('apply')"
        >{{ $t('pages.calendar.applyPlan') }}</AppButton
      ></template
    >
  </Modal>
</template>
