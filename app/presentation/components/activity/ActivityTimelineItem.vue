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

<style scoped>
.activity-item {
  padding-inline: 0.3rem;
  border-radius: 0.75rem;
}
.activity-item.is-unread {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
}
.activity-item__icon[data-tone='warning'] {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
.activity-item__icon[data-tone='info'] {
  color: var(--color-info, #3b82f6);
  background: color-mix(in srgb, var(--color-info, #3b82f6) 12%, transparent);
}
.activity-item__unread {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--color-accent);
}
.activity-item__details-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
  font-weight: 700;
}
.activity-item__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0.55rem;
  margin-top: 0.55rem;
  border-radius: 0.6rem;
  background: var(--color-bg-alt);
}
.activity-item__details div {
  min-width: 0;
}
.activity-item__details dt {
  color: var(--color-text-secondary);
  font-size: 0.6rem;
}
.activity-item__details dd {
  overflow: hidden;
  font-size: 0.68rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 560px) {
  .activity-item__details {
    grid-template-columns: 1fr;
  }
}
</style>
