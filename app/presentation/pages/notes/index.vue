<script setup lang="ts">
import {
  createStickyNote,
  deleteStickyNote,
  fetchStickyNotes,
  updateStickyNote
} from '~/data/repositories/stickyNotesRepository'
import { createTask } from '~/data/repositories/tasksRepository'
import type { CreateStickyNoteInput, StickyNote, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'
import { dateToWeek } from '~/domain/services/week'
import type { NotesView } from '~/presentation/components/notes/NotesToolbar.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const notes = ref<StickyNote[]>([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref<string | null>(null)
const query = ref(String(route.query.q ?? ''))
const view = computed<NotesView>(() => {
  const value = String(route.query.view ?? 'today')
  return ['today', 'pinned', 'all', 'archive'].includes(value) ? (value as NotesView) : 'today'
})
const today = new Date().toLocaleDateString('en-CA')
const stickyCreatedBus = useEventBus<StickyNote>('weekflow:sticky-created')
const offlineQueue = useOfflineMutationQueue()

const active = computed(() => notes.value.filter((note) => !note.archivedAt))
const counts = computed<Record<NotesView, number>>(() => ({
  today: active.value.filter((note) => note.noteDate === today || !note.noteDate).length,
  pinned: active.value.filter((note) => note.pinned).length,
  all: active.value.length,
  archive: notes.value.filter((note) => Boolean(note.archivedAt)).length
}))
const visible = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  const source =
    view.value === 'archive'
      ? notes.value.filter((note) => note.archivedAt)
      : view.value === 'pinned'
        ? active.value.filter((note) => note.pinned)
        : view.value === 'today'
          ? active.value.filter((note) => note.noteDate === today || !note.noteDate)
          : active.value
  return source
    .filter(
      (note) => !term || `${note.title} ${note.content} ${note.labels.join(' ')}`.toLocaleLowerCase().includes(term)
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.sortOrder - a.sortOrder || b.updatedAt - a.updatedAt)
})
const pinnedNotes = computed(() => (view.value === 'today' ? visible.value.filter((note) => note.pinned) : []))
const regularNotes = computed(() =>
  view.value === 'today' ? visible.value.filter((note) => !note.pinned) : visible.value
)

stickyCreatedBus.on((note) => {
  if (!notes.value.some((item) => item.id === note.id)) notes.value.unshift(note)
})

onMounted(async () => {
  try {
    notes.value = await fetchStickyNotes()
  } finally {
    loading.value = false
  }
})
watch(query, (value) => router.replace({ query: { ...route.query, q: value || undefined } }))

async function addNote(input: CreateStickyNoteInput) {
  if (saving.value) return
  saving.value = true
  try {
    notes.value.unshift(await createStickyNote(input))
    toast.add({ title: t('pages.notes.created'), color: 'success' })
  } finally {
    saving.value = false
  }
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

function noteItems(note: StickyNote) {
  return note.content
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

async function saveContent(note: StickyNote, value: { title: string; content: string }) {
  const normalized = noteItems({ ...note, content: value.content }).join('\n')
  if (!normalized) return
  editingId.value = null
  await patchNote(note, {
    title: value.title.trim(),
    content: normalized,
    checkedItems: (note.checkedItems ?? []).filter((index) => index < normalized.split('\n').length),
    done: false,
    completedAt: null
  })
}

async function toggleItem(note: StickyNote, itemIndex: number) {
  const checked = new Set(note.checkedItems ?? [])
  checked.has(itemIndex) ? checked.delete(itemIndex) : checked.add(itemIndex)
  const checkedItems = [...checked].sort((a, b) => a - b)
  const done = checkedItems.length === noteItems(note).length
  await patchNote(note, { checkedItems, done, completedAt: done ? Date.now() : null })
}

async function toggleAll(note: StickyNote) {
  const done = !note.done
  await patchNote(note, {
    done,
    checkedItems: done ? noteItems(note).map((_, index) => index) : [],
    completedAt: done ? Date.now() : null
  })
}

async function duplicateNote(note: StickyNote) {
  const copy = await createStickyNote({
    title: note.title,
    content: note.content,
    color: note.color,
    noteDate: note.noteDate,
    labels: note.labels
  })
  notes.value.unshift(copy)
  toast.add({ title: t('pages.notes.duplicated'), color: 'success' })
}

async function convertToTask(note: StickyNote) {
  if (note.linkedTaskId) return
  const plannedDate = note.noteDate ?? today
  const task = await createTask({
    title: note.title || noteItems(note)[0] || t('pages.notes.untitled'),
    note:
      noteItems(note)
        .slice(note.title ? 0 : 1)
        .join('\n') || null,
    week: dateToWeek(new Date(`${plannedDate}T12:00:00`)),
    plannedDate,
    status: 'todo'
  })
  await patchNote(note, { linkedTaskId: task.id, archivedAt: Date.now() })
  toast.add({ title: t('pages.notes.converted'), color: 'success' })
}

async function removeNote(note: StickyNote) {
  await offlineQueue.capture(
    { url: `/api/sticky-notes/${note.id}`, method: 'DELETE' },
    () => deleteStickyNote(note.id),
    { ok: true }
  )
  notes.value = notes.value.filter((item) => item.id !== note.id)
}

function changeView(next: NotesView) {
  router.replace({ query: { ...route.query, view: next === 'today' ? undefined : next } })
}
</script>

<template>
  <div class="notes-page app-container space-y-4">
    <PageHeader
      :title="$t('pages.notes.title')"
      :description="$t('pages.notes.description')"
      icon="i-lucide-sticky-note"
    />
    <NotesQuickCapture @create="addNote" />
    <NotesToolbar
      :view="view"
      :query="query"
      :counts="counts"
      @view="changeView"
      @query="query = $event"
    />

    <div
      v-if="loading"
      class="notes-page__skeleton grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <USkeleton
        v-for="index in 4"
        :key="index"
        class="h-64 rounded-2xl"
      />
    </div>
    <main
      v-else
      class="notes-page__workspace space-y-7"
    >
      <NotesSection
        v-if="view === 'today' && pinnedNotes.length"
        :title="$t('pages.notes.sections.pinned')"
        icon="i-lucide-pin"
        :notes="pinnedNotes"
        :editing-id="editingId"
        :empty="$t('pages.notes.emptyHint')"
        @edit="editingId = editingId === $event ? null : $event"
        @patch="patchNote"
        @save="saveContent"
        @toggle-item="toggleItem"
        @toggle-all="toggleAll"
        @remove="removeNote"
        @duplicate="duplicateNote"
        @convert="convertToTask"
      />
      <NotesSection
        :title="$t(`pages.notes.sections.${view === 'today' ? 'today' : view}`)"
        :icon="view === 'archive' ? 'i-lucide-archive' : view === 'pinned' ? 'i-lucide-pin' : 'i-lucide-layout-grid'"
        :notes="regularNotes"
        :editing-id="editingId"
        :empty="query ? $t('pages.notes.noResults') : $t('pages.notes.emptyHint')"
        @edit="editingId = editingId === $event ? null : $event"
        @patch="patchNote"
        @save="saveContent"
        @toggle-item="toggleItem"
        @toggle-all="toggleAll"
        @remove="removeNote"
        @duplicate="duplicateNote"
        @convert="convertToTask"
      />
    </main>
  </div>
</template>
