<script setup lang="ts">
import {
  createStickyNote,
  deleteStickyNote,
  fetchStickyNotes,
  updateStickyNote
} from '~/data/repositories/stickyNotesRepository'
import type { StickyNote, StickyNoteColor, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

const { t, locale } = useI18n()
const notes = ref<StickyNote[]>([])
const draft = ref('')
const loading = ref(true)
const saving = ref(false)
const draggingId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const board = useTemplateRef<HTMLElement>('board')
const colors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green']
const stickyCreatedBus = useEventBus<StickyNote>('weekflow:sticky-created')

stickyCreatedBus.on((note) => {
  if (!notes.value.some((item) => item.id === note.id)) notes.value.push(note)
})

const colorClasses: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-200 text-amber-950 shadow-amber-950/10',
  pink: 'bg-rose-200 text-rose-950 shadow-rose-950/10',
  blue: 'bg-sky-200 text-sky-950 shadow-sky-950/10',
  green: 'bg-emerald-200 text-emerald-950 shadow-emerald-950/10'
}

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

function formatDate(createdAt: number) {
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(createdAt)
}

async function patchNote(note: StickyNote, patch: UpdateStickyNoteInput) {
  const updated = await updateStickyNote(note.id, patch)
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
  await deleteStickyNote(id)
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

      <article
        v-for="note in notes"
        v-else
        :key="note.id"
        draggable="true"
        class="sticky-note notes-page__note group mb-4 flex min-h-48 flex-col rounded-sm p-4 shadow-xl transition-[transform,opacity] duration-200 hover:scale-[1.015] hover:-rotate-1 md:mb-0"
        :class="[colorClasses[note.color], { 'sticky-note--done opacity-60': note.done }]"
        :style="{ '--note-x': `${note.positionX}px`, '--note-y': `${note.positionY}px` }"
        @dragstart="startDrag(note)"
      >
        <div class="sticky-note__toolbar mb-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="grid size-7 cursor-grab place-items-center rounded-md opacity-55 hover:bg-black/10 hover:opacity-100 active:cursor-grabbing"
              :title="$t('pages.notes.move')"
            >
              <UIcon
                name="i-lucide-grip"
                class="size-4"
              />
            </button>
            <time class="text-[10px] font-semibold tracking-wide uppercase opacity-55">
              {{ formatDate(note.createdAt) }}
            </time>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              class="size-4 rounded-full border border-black/15 transition-transform hover:scale-125"
              :class="[
                colorClasses[color].split(' ')[0],
                note.color === color ? 'ring-2 ring-black/35 ring-offset-1 ring-offset-transparent' : ''
              ]"
              :aria-label="$t('pages.notes.changeColor', { color: $t(`pages.notes.colors.${color}`) })"
              @click="patchNote(note, { color })"
            />
            <button
              type="button"
              class="ml-1 grid size-6 place-items-center rounded-md opacity-55 hover:bg-black/10 hover:opacity-100"
              :title="$t('pages.notes.edit')"
              @click="editingId = editingId === note.id ? null : note.id"
            >
              <UIcon
                name="i-lucide-pencil"
                class="size-3.5"
              />
            </button>
          </div>
        </div>

        <textarea
          v-if="editingId === note.id"
          :value="note.content"
          class="sticky-note__content min-h-24 flex-1 resize-none bg-transparent text-[15px] leading-6 font-medium outline-none"
          :aria-label="$t('pages.notes.content')"
          @blur="saveContent(note, ($event.target as HTMLTextAreaElement).value)"
        />
        <ol
          v-else
          class="sticky-note__items min-h-24 flex-1 space-y-1.5"
        >
          <li
            v-for="(item, itemIndex) in noteItems(note)"
            :key="`${note.id}-${itemIndex}`"
          >
            <button
              type="button"
              class="sticky-note__item flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm leading-5 hover:bg-black/[0.06]"
              :class="{ 'sticky-note__item--checked opacity-55': (note.checkedItems ?? []).includes(itemIndex) }"
              @click="toggleItem(note, itemIndex)"
            >
              <span class="mt-0.5 min-w-4 text-right text-xs font-bold opacity-55">{{ itemIndex + 1 }}.</span>
              <span
                class="flex-1"
                :class="(note.checkedItems ?? []).includes(itemIndex) ? 'line-through' : ''"
                >{{ item }}</span
              >
              <UIcon
                :name="(note.checkedItems ?? []).includes(itemIndex) ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
                class="mt-0.5 size-4 shrink-0"
              />
            </button>
          </li>
        </ol>

        <footer class="sticky-note__footer mt-3 flex items-center justify-between border-t border-black/10 pt-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/10"
            @click="toggleAll(note)"
          >
            <UIcon :name="note.done ? 'i-lucide-rotate-ccw' : 'i-lucide-check'" />
            {{ note.done ? $t('pages.notes.reopenAll') : $t('pages.notes.completeAll') }}
          </button>
          <IconButton
            icon="i-lucide-trash-2"
            :label="$t('pages.notes.delete')"
            variant="danger"
            size="sm"
            @click="removeNote(note.id)"
          />
        </footer>
      </article>
    </section>
  </div>
</template>

<style scoped>
@media (min-width: 768px) {
  .sticky-note {
    position: absolute;
    top: var(--note-y);
    left: var(--note-x);
    width: 15rem;
  }
}
</style>
