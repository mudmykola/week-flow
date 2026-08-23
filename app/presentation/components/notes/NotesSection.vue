<script setup lang="ts">
import type { StickyNote, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

defineProps<{ title: string; icon: string; notes: StickyNote[]; editingId: string | null; empty: string }>()
const emit = defineEmits<{
  edit: [id: string]
  patch: [note: StickyNote, patch: UpdateStickyNoteInput]
  save: [note: StickyNote, value: { title: string; content: string }]
  toggleItem: [note: StickyNote, index: number]
  toggleAll: [note: StickyNote]
  remove: [note: StickyNote]
  duplicate: [note: StickyNote]
  convert: [note: StickyNote]
}>()

const items = (note: StickyNote) =>
  note.content
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
</script>

<template>
  <section class="notes-section">
    <header class="notes-section__header mb-3 flex items-center gap-2">
      <UIcon
        :name="icon"
        class="size-4 text-[var(--color-accent)]"
      />
      <h2 class="text-sm font-semibold">{{ title }}</h2>
      <SemanticBadge
        tone="neutral"
        size="sm"
        >{{ notes.length }}</SemanticBadge
      >
    </header>
    <div
      v-if="notes.length"
      class="notes-section__grid grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      <StickyNoteCard
        v-for="note in notes"
        :key="note.id"
        :note="note"
        :items="items(note)"
        :editing="editingId === note.id"
        @edit="emit('edit', note.id)"
        @patch="emit('patch', note, $event)"
        @save="emit('save', note, $event)"
        @toggle-item="emit('toggleItem', note, $event)"
        @toggle-all="emit('toggleAll', note)"
        @remove="emit('remove', note)"
        @duplicate="emit('duplicate', note)"
        @convert="emit('convert', note)"
      />
    </div>
    <p
      v-else
      class="notes-section__empty surface-card text-secondary px-4 py-8 text-center text-sm"
    >
      {{ empty }}
    </p>
  </section>
</template>
