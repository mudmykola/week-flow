<script setup lang="ts">
import type { TaskActivityItem } from '~/application/composables/useTaskDetails'
import { groupTaskActivity } from '~/domain/services/taskActivity'
const props = defineProps<{ items: TaskActivityItem[] }>()
const expanded = ref(false)
const grouped = computed(() => groupTaskActivity(props.items))
const visible = computed(() => (expanded.value ? grouped.value : grouped.value.slice(0, 6)))
const { t, locale } = useI18n()
function actionLabel(action: string) {
  const key = `activityActions.${action}`
  return t(key, action)
}
function fieldLabel(field: string) {
  const key = `activityFields.${field}`
  return t(key, field)
}
function formatTime(value: number) {
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)
}
</script>

<template>
  <section class="task-activity rounded-2xl border border-[var(--color-panel-border)] p-4">
    <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
      <UIcon name="i-lucide-activity" />{{ $t('task.activity') }}
    </h3>
    <div
      v-if="visible.length"
      class="task-activity__timeline space-y-1"
    >
      <div
        v-for="item in visible"
        :key="item.id"
        class="task-activity__item flex gap-3 rounded-xl px-2.5 py-2.5 text-xs hover:bg-[var(--color-bg-alt)]"
      >
        <span
          class="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)]"
          ><UIcon
            :name="
              item.action === 'task.updated'
                ? 'i-lucide-pencil-line'
                : item.action === 'task.created'
                  ? 'i-lucide-plus'
                  : 'i-lucide-activity'
            "
        /></span>
        <div class="min-w-0 flex-1">
          <p class="leading-5">
            <strong>{{ item.actorName }}</strong> {{ actionLabel(item.action) }}
            <span
              v-if="item.count > 1"
              class="count-badge ml-1"
              >×{{ item.count }}</span
            >
          </p>
          <p
            v-if="item.changedFields.length"
            class="text-secondary mt-0.5 truncate"
          >
            {{ item.changedFields.slice(0, 4).map(fieldLabel).join(' · ')
            }}<span v-if="item.changedFields.length > 4"> · +{{ item.changedFields.length - 4 }}</span>
          </p>
          <time class="text-secondary mt-0.5 block text-[11px]">{{ formatTime(item.createdAt) }}</time>
        </div>
      </div>
    </div>
    <p
      v-else
      class="text-secondary text-xs"
    >
      {{ $t('task.noActivity') }}
    </p>
    <button
      v-if="grouped.length > 6"
      type="button"
      class="text-secondary mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--color-bg-alt)]"
      @click="expanded = !expanded"
    >
      <UIcon :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />{{
        expanded ? $t('task.showLessActivity') : $t('task.showAllActivity', { count: grouped.length })
      }}
    </button>
  </section>
</template>
