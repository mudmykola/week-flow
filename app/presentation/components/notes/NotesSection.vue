<script setup lang="ts">
import draggable from 'vuedraggable'
import type { StickyNote, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

const props = defineProps<{
  title: string
  icon: string
  notes: StickyNote[]
  editingId: string | null
  empty: string
}>()
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

const localNotes = ref<StickyNote[]>([])
const dragging = ref(false)
const items = (note: StickyNote) =>
  note.content
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

watch(
  () => props.notes,
  (notes) => {
    if (!dragging.value) localNotes.value = [...notes]
  },
  { immediate: true, deep: true }
)

function onDragStart() {
  dragging.value = true
}

function onDragEnd() {
  const highestOrder = Math.max(0, ...props.notes.map((note) => note.sortOrder))
  localNotes.value.forEach((note, index) => {
    const sortOrder = highestOrder + localNotes.value.length - index
    emit('patch', note, { sortOrder, positionX: 0, positionY: 0 })
  })
  dragging.value = false
}
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
      <span
        v-if="notes.length"
        class="notes-section__hint"
        ><UIcon name="i-lucide-grip" />{{ $t('pages.notes.sortHint') }}</span
      >
    </header>
    <draggable
      v-if="notes.length"
      v-model="localNotes"
      item-key="id"
      tag="div"
      class="notes-section__grid"
      handle=".sticky-note-card__drag-handle"
      ghost-class="notes-section__note--ghost"
      chosen-class="notes-section__note--chosen"
      drag-class="notes-section__note--dragging"
      :animation="180"
      @start="onDragStart"
      @end="onDragEnd"
    >
      <template #item="{ element: note }">
        <div class="notes-section__note">
          <StickyNoteCard
            :note="note"
            :items="items(note)"
            :editing="false"
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
      </template>
    </draggable>
    <p
      v-else
      class="notes-section__empty surface-card text-secondary px-4 py-8 text-center text-sm"
    >
      {{ empty }}
    </p>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/notes/notes-section.css"></style>
