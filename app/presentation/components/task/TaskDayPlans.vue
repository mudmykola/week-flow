<script setup lang="ts">
import { fetchTaskDayPlans } from '~/data/repositories/taskDayPlansRepository'
import type { Task, UpdateTaskInput } from '~/domain/entities/task'
import type { TaskDayPlan } from '~/domain/entities/taskDayPlan'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ patch: [value: UpdateTaskInput] }>()
const { t, locale } = useI18n()
const plans = ref<TaskDayPlan[]>([])
const loading = ref(true)
const date = ref(props.task.plannedDate || '')
const time = ref(props.task.plannedTime || '')
const minutes = ref<number | null>(props.task.estimateMinutes)
const reason = ref('')

const statusMeta = {
  planned: { icon: 'i-lucide-calendar-clock', tone: 'info' },
  completed: { icon: 'i-lucide-circle-check-big', tone: 'success' },
  moved: { icon: 'i-lucide-arrow-right', tone: 'warning' },
  skipped: { icon: 'i-lucide-circle-slash', tone: 'neutral' }
} as const

async function load() {
  loading.value = true
  try {
    plans.value = await fetchTaskDayPlans(props.task.id)
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00`)
  )
}

function applyPlan() {
  if (!date.value) return
  emit('patch', {
    plannedDate: date.value,
    plannedTime: time.value || null,
    estimateMinutes: minutes.value || null,
    carryoverReason: date.value !== props.task.plannedDate ? reason.value.trim() || null : props.task.carryoverReason
  })
}

watch(
  () => [props.task.plannedDate, props.task.plannedTime, props.task.estimateMinutes],
  async () => {
    date.value = props.task.plannedDate || ''
    time.value = props.task.plannedTime || ''
    minutes.value = props.task.estimateMinutes
    reason.value = ''
    await load()
  }
)

onMounted(load)
</script>

<template>
  <section class="task-day-plans rounded-2xl border border-[var(--color-panel-border)] p-4">
    <header class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <strong class="flex items-center gap-2"
          ><UIcon name="i-lucide-calendar-range" />{{ t('task.dayPlans') }}</strong
        >
        <p class="text-secondary text-xs">{{ t('task.dayPlansHint') }}</p>
      </div>
      <SemanticBadge tone="info">{{ t('task.activeDays', { count: plans.length }) }}</SemanticBadge>
    </header>

    <div class="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
      <FormInput
        v-model="date"
        type="date"
        :aria-label="t('task.plannedDate')"
      />
      <FormInput
        v-model="time"
        type="time"
        :aria-label="t('task.plannedTime')"
      />
      <FormInput
        v-model="minutes"
        type="number"
        min="1"
        max="1440"
        :placeholder="t('pages.review.progress.minutes')"
      />
      <AppButton
        icon="i-lucide-calendar-plus"
        :disabled="!date"
        @click="applyPlan"
        >{{ date !== task.plannedDate ? t('task.moveToDay') : t('common.save') }}</AppButton
      >
      <FormInput
        v-if="date && date !== task.plannedDate && task.plannedDate"
        v-model="reason"
        class="sm:col-span-4"
        :placeholder="t('task.carryoverReasonPlaceholder')"
      />
    </div>

    <div
      v-if="loading"
      class="text-secondary mt-3 text-xs"
    >
      {{ t('common.loading') }}
    </div>
    <ol
      v-else-if="plans.length"
      class="mt-4 grid max-h-44 gap-2 overflow-y-auto pr-1"
    >
      <li
        v-for="plan in plans"
        :key="plan.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-bg-alt)] px-3 py-2 text-sm"
      >
        <span class="flex items-center gap-2">
          <UIcon :name="statusMeta[plan.status].icon" />
          <strong>{{ formatDate(plan.plannedDate) }}</strong>
          <span
            v-if="plan.plannedTime"
            class="text-secondary"
            >{{ plan.plannedTime }}</span
          >
          <span
            v-if="plan.plannedMinutes"
            class="text-secondary"
            >· {{ t('task.minutes', { count: plan.plannedMinutes }) }}</span
          >
        </span>
        <SemanticBadge :tone="statusMeta[plan.status].tone">{{ t(`task.dayPlanStatus.${plan.status}`) }}</SemanticBadge>
        <p
          v-if="plan.carryoverReason"
          class="text-secondary basis-full text-xs"
        >
          {{ plan.carryoverReason }}
        </p>
      </li>
    </ol>
    <p
      v-else
      class="text-secondary mt-3 text-xs"
    >
      {{ t('task.noDayPlans') }}
    </p>
  </section>
</template>
