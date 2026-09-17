<script setup lang="ts">
import type { StickyNote, StickyNoteColor, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

const props = defineProps<{ note: StickyNote; editing: boolean; items: string[] }>()
const emit = defineEmits<{
  patch: [patch: UpdateStickyNoteInput]
  save: [value: { title: string; content: string }]
  toggleItem: [index: number]
  toggleAll: []
  remove: []
  edit: []
  duplicate: []
  convert: []
}>()
const { locale } = useI18n()
const colors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green']
const colorClasses: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-200 text-amber-950 shadow-amber-950/10',
  pink: 'bg-rose-200 text-rose-950 shadow-rose-950/10',
  blue: 'bg-sky-200 text-sky-950 shadow-sky-950/10',
  green: 'bg-emerald-200 text-emerald-950 shadow-emerald-950/10'
}
const checked = (index: number) => (props.note.checkedItems ?? []).includes(index)
const checkedItems = computed(() => props.note.checkedItems ?? [])
const editTitle = ref(props.note.title)
const editContent = ref(props.note.content)
watch(
  () => props.editing,
  (editing) => {
    if (editing) {
      editTitle.value = props.note.title
      editContent.value = props.note.content
    }
  }
)
const formattedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(props.note.createdAt)
)
</script>

<template>
  <article
    class="sticky-note sticky-note-card group flex min-h-56 flex-col overflow-hidden rounded-2xl border border-black/10 p-4 shadow-lg transition-[transform,opacity] duration-200 hover:-translate-y-0.5"
    :class="[colorClasses[note.color], { 'sticky-note--done opacity-60': note.done }]"
  >
    <div class="sticky-note-card__toolbar mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="sticky-note-card__drag-handle"
          data-drag-handle
          :aria-label="$t('pages.notes.drag')"
        >
          <UIcon name="i-lucide-grip" />
        </button>
        <UIcon
          name="i-lucide-sticky-note"
          class="size-4 opacity-55"
        />
        <time class="text-[10px] font-semibold tracking-wide uppercase opacity-55">{{ formattedDate }}</time>
      </div>
      <div class="sticky-note-card__quick-actions flex items-center gap-1">
        <IconButton
          class="ml-1"
          icon="i-lucide-pencil"
          :label="$t('pages.notes.edit')"
          variant="ghost"
          size="sm"
          @click="emit('edit')"
        />
        <IconButton
          :icon="note.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
          :label="note.pinned ? $t('pages.notes.unpin') : $t('pages.notes.pin')"
          variant="ghost"
          size="sm"
          @click="emit('patch', { pinned: !note.pinned })"
        />
      </div>
    </div>

    <div
      v-if="editing"
      class="sticky-note-card__editor flex flex-1 flex-col gap-2"
    >
      <input
        v-model="editTitle"
        class="bg-transparent text-base font-bold outline-none"
        :placeholder="$t('pages.notes.titlePlaceholder')"
      />
      <textarea
        v-model="editContent"
        class="sticky-note-card__content min-h-32 flex-1 resize-none bg-transparent text-sm leading-6 outline-none"
        :aria-label="$t('pages.notes.content')"
      />
      <AppButton
        size="sm"
        variant="secondary"
        icon="i-lucide-check"
        @click="emit('save', { title: editTitle, content: editContent })"
      >
        {{ $t('common.save') }}
      </AppButton>
    </div>
    <template v-else>
      <h3
        v-if="note.title"
        class="sticky-note-card__title mb-2 text-base font-bold"
      >
        {{ note.title }}
      </h3>
      <ol class="sticky-note-card__items sticky-note__items min-h-24 flex-1 space-y-1.5">
        <li
          v-for="(item, index) in items"
          :key="`${note.id}-${index}`"
        >
          <button
            type="button"
            class="sticky-note-card__item sticky-note__item flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm leading-5 hover:bg-black/[0.06]"
            :class="{ 'sticky-note-card__item--checked opacity-55': checked(index) }"
            @click="emit('toggleItem', index)"
          >
            <span class="mt-0.5 min-w-4 text-right text-xs font-bold opacity-55">{{ index + 1 }}.</span>
            <span
              class="flex-1"
              :class="checked(index) ? 'line-through' : ''"
              >{{ item }}</span
            >
            <UIcon
              :name="checked(index) ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
              class="mt-0.5 size-4 shrink-0"
            />
          </button>
        </li>
      </ol>
    </template>

    <div class="sticky-note-card__meta mt-3 flex items-center justify-between text-[11px] font-medium opacity-60">
      <span>{{ checkedItems.length }} / {{ items.length }}</span>
      <span v-if="note.noteDate"
        ><UIcon
          name="i-lucide-calendar"
          class="mr-1 inline size-3"
        />{{ note.noteDate }}</span
      >
    </div>

    <footer
      class="sticky-note-card__footer sticky-note__footer mt-3 flex items-center justify-between border-t border-black/10 pt-2"
    >
      <AppButton
        variant="ghost"
        size="sm"
        :icon="note.done ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
        @click="emit('toggleAll')"
      >
        {{ note.done ? $t('pages.notes.reopenAll') : $t('pages.notes.completeAll') }}
      </AppButton>
      <IconButton
        v-if="note.archivedAt"
        icon="i-lucide-archive-restore"
        :label="$t('pages.notes.restore')"
        variant="ghost"
        size="sm"
        @click="emit('patch', { archivedAt: null })"
      />
      <details class="sticky-note-card__actions relative ml-auto">
        <summary
          class="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-black/5"
          :aria-label="$t('pages.notes.more')"
        >
          <UIcon
            name="i-lucide-ellipsis"
            class="size-4"
          />
        </summary>
        <div
          class="absolute right-0 bottom-9 z-10 grid w-44 gap-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1.5 text-[var(--color-text-primary)] shadow-xl"
        >
          <div class="sticky-note-card__menu-colors flex items-center gap-2 px-2 py-1.5">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              class="size-4 rounded-full border border-black/15 transition-transform hover:scale-125"
              :class="[
                colorClasses[color].split(' ')[0],
                note.color === color ? 'ring-2 ring-[var(--color-text-primary)] ring-offset-1' : ''
              ]"
              :aria-label="$t('pages.notes.changeColor', { color: $t(`pages.notes.colors.${color}`) })"
              @click="emit('patch', { color })"
            />
          </div>
          <button
            type="button"
            class="rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--color-bg-muted)]"
            @click="emit('duplicate')"
          >
            {{ $t('pages.notes.duplicate') }}
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--color-bg-muted)]"
            @click="emit('convert')"
          >
            {{ $t('pages.notes.convert') }}
          </button>
          <button
            v-if="!note.archivedAt"
            type="button"
            class="rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--color-bg-muted)]"
            @click="emit('patch', { archivedAt: Date.now() })"
          >
            {{ $t('pages.notes.archive') }}
          </button>
        </div>
      </details>
      <IconButton
        icon="i-lucide-trash-2"
        :label="$t('pages.notes.delete')"
        variant="danger"
        size="sm"
        @click="emit('remove')"
      />
    </footer>
  </article>
</template>

<style scoped src="~/presentation/assets/css/components/notes/sticky-note-card.css"></style>
