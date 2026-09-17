<script setup lang="ts">
import type { InboxDestination, InboxItem } from '~/domain/entities/inbox'

defineProps<{
  items: InboxItem[]
  selected: string[]
  editingId: string | null
  editingContent: string
}>()
defineEmits<{
  select: [id: string, value: boolean]
  startEdit: [item: InboxItem]
  saveEdit: [item: InboxItem]
  'update:editingContent': [value: string]
  resolve: [item: InboxItem, destination: InboxDestination]
  dismiss: [item: InboxItem]
}>()

function ageDays(item: InboxItem) {
  return Math.max(0, Math.floor((Date.now() - item.createdAt) / 86_400_000))
}
</script>

<template>
  <section class="inbox-queue inbox-workspace__list">
    <article
      v-for="item in items"
      :key="item.id"
      class="inbox-item"
      :class="{ 'inbox-item--stale': ageDays(item) >= 3 }"
    >
      <input
        type="checkbox"
        :checked="selected.includes(item.id)"
        :aria-label="$t('pages.inbox.selectItem')"
        @change="$emit('select', item.id, ($event.target as HTMLInputElement).checked)"
      />
      <div class="inbox-item__content">
        <input
          v-if="editingId === item.id"
          :value="editingContent"
          class="inbox-item__edit"
          autofocus
          @input="$emit('update:editingContent', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="$emit('saveEdit', item)"
          @blur="$emit('saveEdit', item)"
        />
        <button
          v-else
          type="button"
          @click="$emit('startEdit', item)"
        >
          {{ item.content }}
        </button>
        <span>{{ $t('pages.inbox.age', { days: ageDays(item) }) }}</span>
      </div>
      <div class="inbox-item__actions">
        <IconButton
          v-for="action in [
            ['today', 'i-lucide-sun', 'pages.inbox.toToday'],
            ['task', 'i-lucide-square-check-big', 'pages.inbox.toTask'],
            ['sticky', 'i-lucide-sticky-note', 'pages.inbox.toSticky'],
            ['project', 'i-lucide-folder-plus', 'pages.inbox.toProject'],
            ['goal', 'i-lucide-target', 'pages.inbox.toGoal']
          ] as const"
          :key="action[0]"
          :icon="action[1]"
          :label="$t(action[2])"
          @click="$emit('resolve', item, action[0])"
        />
        <IconButton
          icon="i-lucide-trash-2"
          :label="$t('common.delete')"
          @click="$emit('dismiss', item)"
        />
      </div>
    </article>
  </section>
</template>
