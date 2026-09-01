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

<style scoped>
.notes-section__header {
  min-height: 2rem;
}
.notes-section__hint {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.notes-section__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(17rem, 100%), 1fr));
  align-items: start;
  gap: 1rem;
  min-height: 20rem;
  padding: 0.25rem;
  border-radius: 1rem;
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-panel-border) 55%, transparent) 1px,
    transparent 1px
  );
  background-size: 22px 22px;
}
.notes-section__note {
  min-width: 0;
  transition:
    transform 0.18s,
    opacity 0.18s,
    filter 0.18s;
}
.notes-section__note :deep(.sticky-note-card) {
  width: 100%;
  min-height: 16rem;
}
.notes-section__note--ghost {
  opacity: 0.22;
}
.notes-section__note--chosen {
  filter: drop-shadow(0 18px 20px rgb(0 0 0 / 0.22));
}
.notes-section__note--dragging {
  z-index: 20;
  transform: rotate(1deg) scale(1.015);
}
@media (max-width: 639px) {
  .notes-section__hint {
    display: none;
  }
  .notes-section__grid {
    grid-template-columns: 1fr;
    background: none;
  }
}
</style>
