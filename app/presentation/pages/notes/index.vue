<script setup lang="ts">
import {
  createStickyNote,
  deleteStickyNote,
  fetchStickyNotes,
  updateStickyNote
} from '~/data/repositories/stickyNotesRepository'
import type { StickyNote, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

const { t } = useI18n()
const notes = ref<StickyNote[]>([])
const draft = ref('')
const loading = ref(true)
const saving = ref(false)
const draggingId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const board = useTemplateRef<HTMLElement>('board')
const stickyCreatedBus = useEventBus<StickyNote>('weekflow:sticky-created')
const offlineQueue = useOfflineMutationQueue()

stickyCreatedBus.on((note) => {
  if (!notes.value.some((item) => item.id === note.id)) notes.value.push(note)
})

onMounted(async () => {
  try {
    notes.value = await fetchStickyNotes()
  } finally {
    loading.value = false
  }
})

async function addNote() {
  const content = parseItems(draft.value).join('\n')
  if (!content || saving.value) return
  saving.value = true
  try {
    const index = notes.value.length
    const note = await createStickyNote({
      content,
      positionX: 24 + (index % 4) * 264,
      positionY: 24 + Math.floor(index / 4) * 224
    })
    notes.value.push(note)
    draft.value = ''
  } finally {
    saving.value = false
  }
}

function parseItems(content: string) {
  return content
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

function startDraft() {
  if (!draft.value.trim()) draft.value = '1. '
}

async function addDraftLine(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey) {
    await addNote()
    return
  }
  const textarea = event.currentTarget as HTMLTextAreaElement
  const cursor = textarea.selectionStart
  const before = draft.value.slice(0, cursor)
  const after = draft.value.slice(textarea.selectionEnd)
  const nextNumber = before.split('\n').length + 1
  const insertion = `\n${nextNumber}. `
  draft.value = `${before}${insertion}${after}`
  await nextTick()
  textarea.setSelectionRange(cursor + insertion.length, cursor + insertion.length)
}

function noteItems(note: StickyNote) {
  return parseItems(note.content)
}

async function patchNote(note: StickyNote, patch: UpdateStickyNoteInput) {
  const updated = await offlineQueue.capture(
    { url: `/api/sticky-notes/${note.id}`, method: 'PATCH', body: patch },
    () => updateStickyNote(note.id, patch),
    { ...note, ...patch, updatedAt: Date.now() }
  )
  const index = notes.value.findIndex((item) => item.id === note.id)
  if (index !== -1) notes.value[index] = updated
}

async function saveContent(note: StickyNote, content: string) {
  const normalized = parseItems(content).join('\n')
  editingId.value = null
  if (!normalized || normalized === note.content) return
  const checkedItems = (note.checkedItems ?? []).filter((index) => index < parseItems(normalized).length)
  await patchNote(note, { content: normalized, checkedItems, done: false })
}

async function toggleItem(note: StickyNote, itemIndex: number) {
  const checked = new Set(note.checkedItems ?? [])
  if (checked.has(itemIndex)) checked.delete(itemIndex)
  else checked.add(itemIndex)
  const checkedItems = [...checked].sort((a, b) => a - b)
  await patchNote(note, { checkedItems, done: checkedItems.length === noteItems(note).length })
}

async function toggleAll(note: StickyNote) {
  const done = !note.done
  await patchNote(note, {
    done,
    checkedItems: done ? noteItems(note).map((_, index) => index) : []
  })
}

async function removeNote(id: string) {
  await offlineQueue.capture({ url: `/api/sticky-notes/${id}`, method: 'DELETE' }, () => deleteStickyNote(id), {
    ok: true
  })
  notes.value = notes.value.filter((note) => note.id !== id)
}

function startDrag(note: StickyNote) {
  draggingId.value = note.id
}

async function dropNote(event: DragEvent) {
  if (!draggingId.value || !board.value) return
  const note = notes.value.find((item) => item.id === draggingId.value)
  draggingId.value = null
  if (!note) return
  const bounds = board.value.getBoundingClientRect()
  const positionX = Math.max(0, Math.round(event.clientX - bounds.left - 120))
  const positionY = Math.max(0, Math.round(event.clientY - bounds.top - 28))
  await patchNote(note, { positionX, positionY })
}
</script>

<template>
  <div class="notes-page app-container max-w-[1600px]">
    <PageHeader
      :title="$t('pages.notes.title')"
      :description="$t('pages.notes.description')"
      icon="i-lucide-sticky-note"
    />

    <section class="notes-page__composer surface-card mb-4 p-3 sm:p-4">
      <div class="flex items-end gap-3">
        <FormField
          class="min-w-0 flex-1"
          :label="$t('pages.notes.quickCapture')"
          icon="i-lucide-pencil-line"
        >
          <FormTextarea
            v-model="draft"
            rows="3"
            :placeholder="$t('pages.notes.placeholder')"
            @focus="startDraft"
            @keydown.enter.prevent="addDraftLine"
          />
        </FormField>
        <AppButton
          class="mb-0.5 shrink-0"
          variant="primary"
          icon="i-lucide-plus"
          :loading="saving"
          @click="addNote"
        >
          {{ $t('pages.notes.add') }}
        </AppButton>
      </div>
      <p class="text-secondary mt-2 flex items-center gap-1.5 text-xs">
        <UIcon name="i-lucide-command" />{{ $t('pages.notes.shortcut') }}
      </p>
    </section>

    <section
      ref="board"
      class="notes-page__board relative min-h-[38rem] overflow-hidden rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 shadow-inner sm:min-h-[44rem]"
      @dragover.prevent
      @drop.prevent="dropNote"
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-35"
        style="
          background-image: radial-gradient(var(--color-panel-border) 1px, transparent 1px);
          background-size: 22px 22px;
        "
      />

      <div
        v-if="loading"
        class="relative grid gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        <USkeleton
          v-for="index in 4"
          :key="index"
          class="h-48 rounded-sm"
        />
      </div>

      <EmptyState
        v-else-if="!notes.length"
        class="notes-page__empty relative mx-auto mt-20 max-w-xl border-0 bg-transparent shadow-none"
        icon="i-lucide-sticky-note"
        :title="$t('pages.notes.empty')"
        :description="$t('pages.notes.emptyHint')"
      />

      <StickyNoteCard
        v-for="note in notes"
        v-else
        :key="note.id"
        :note="note"
        :items="noteItems(note)"
        :editing="editingId === note.id"
        @drag="startDrag(note)"
        @patch="patchNote(note, $event)"
        @save="saveContent(note, $event)"
        @toggle-item="toggleItem(note, $event)"
        @toggle-all="toggleAll(note)"
        @remove="removeNote(note.id)"
        @edit="editingId = editingId === note.id ? null : note.id"
      />
    </section>
  </div>
</template>
