<script setup lang="ts">
import type { ActivityFeedItem } from '~/domain/services/activityFeed'
import type { ActivityGroup } from '~/domain/services/taskActivity'
import { activityIcon, activityImportance, isActivityMove } from '~/domain/services/activityFeed'

const props = defineProps<{ item: ActivityGroup<ActivityFeedItem>; unread?: boolean }>()
const emit = defineEmits<{ open: [item: ActivityFeedItem] }>()
const { t, te, locale } = useI18n()
const expanded = ref(false)
const actionable = computed(
  () => (props.item.entityType === 'task' && props.item.action !== 'task.deleted') || props.item.entityType === 'goal'
)
const actionLabel = computed(() => {
  if (isActivityMove(props.item)) return t('pages.activity.rescheduledItem')
  if (props.item.action === 'task.updated' && props.item.metadata.status === 'done')
    return t('pages.activity.completedItem')
  const key = `activityActions.${props.item.action}`
  return te(key) ? t(key) : t('pages.activity.changedItem')
})
const changedFields = computed(() =>
  props.item.changedFields
    .slice(0, 4)
    .map((field) => (te(`activityFields.${field}`) ? t(`activityFields.${field}`) : field))
)
const time = computed(() =>
  new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(props.item.createdAt)
)
const details = computed(() =>
  Object.entries(props.item.metadata ?? {})
    .filter(([key]) => !['id', 'updatedAt', 'title'].includes(key))
    .slice(0, 8)
)
</script>

<template>
  <article
    class="activity-timeline-item activity-item group relative flex gap-3 py-3 sm:gap-4"
    :class="{ 'cursor-pointer': actionable, 'is-unread': unread }"
    :data-tone="activityImportance(item)"
    :tabindex="actionable ? 0 : undefined"
    @click="actionable && emit('open', item)"
    @keydown.enter="actionable && emit('open', item)"
  >
    <div class="activity-item__rail flex w-9 shrink-0 flex-col items-center">
      <span
        class="activity-item__icon"
        :data-tone="activityImportance(item)"
      >
        <UIcon
          :name="activityIcon(item.action)"
          class="size-4"
        />
      </span>
      <span class="mt-2 h-full w-px bg-[var(--color-panel-border)] group-last:hidden" />
    </div>
    <div class="activity-item__body min-w-0 flex-1 pb-2">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          v-if="unread"
          class="activity-item__unread"
          :aria-label="$t('pages.activity.unread')"
        />
        <img
          v-if="item.actorAvatar"
          :src="item.actorAvatar"
          :alt="item.actorName"
          class="size-5 rounded-full object-cover"
        />
        <span
          v-else
          class="grid size-5 place-items-center rounded-full bg-[var(--color-bg-alt)] text-[9px] font-bold"
          >{{ item.actorName.slice(0, 1) }}</span
        >
        <p class="text-sm">
          <strong>{{ item.actorName }}</strong> {{ actionLabel }}
        </p>
        <span
          v-if="item.count > 1"
          class="count-badge"
          >×{{ item.count }}</span
        >
        <time class="text-secondary ml-auto text-xs">{{ time }}</time>
      </div>
      <p
        class="mt-1 truncate text-sm font-medium"
        :class="actionable ? 'text-[var(--color-accent)]' : ''"
      >
        {{ item.entityTitle || item.metadata.title || $t('pages.activity.unknownEntity') }}
        <UIcon
          v-if="actionable"
          name="i-lucide-arrow-up-right"
          class="ml-1 inline size-3"
        />
      </p>
      <div class="mt-1 flex flex-wrap items-center gap-1.5">
        <span
          v-if="item.projectName"
          class="activity-item__project"
        >
          <i :style="{ backgroundColor: item.projectColor || 'var(--color-accent)' }" />{{ item.projectName }}
        </span>
        <span
          v-for="field in changedFields"
          :key="field"
          class="activity-item__field"
          >{{ field }}</span
        >
        <span
          v-if="item.changedFields.length > 4"
          class="text-secondary text-[11px]"
          >+{{ item.changedFields.length - 4 }}</span
        >
        <button
          v-if="details.length"
          class="activity-item__details-toggle"
          type="button"
          @click.stop="expanded = !expanded"
        >
          {{ expanded ? $t('pages.activity.hideDetails') : $t('pages.activity.showDetails') }}
          <UIcon :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
        </button>
      </div>
      <dl
        v-if="expanded"
        class="activity-item__details"
        @click.stop
      >
        <div
          v-for="[key, value] in details"
          :key="key"
        >
          <dt>{{ te(`activityFields.${key}`) ? t(`activityFields.${key}`) : key }}</dt>
          <dd>{{ value ?? '—' }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>

<style scoped src="~/presentation/assets/css/components/activity/activity-timeline-item.css"></style>
