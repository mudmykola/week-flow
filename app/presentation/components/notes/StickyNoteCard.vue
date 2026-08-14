<script setup lang="ts">
import type { StickyNote, StickyNoteColor, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

const props = defineProps<{ note: StickyNote; editing: boolean; items: string[] }>()
const emit = defineEmits<{
  patch: [patch: UpdateStickyNoteInput]
  save: [content: string]
  toggleItem: [index: number]
  toggleAll: []
  remove: []
  edit: []
  drag: []
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
    draggable="true"
    class="sticky-note sticky-note-card group mb-4 flex min-h-48 flex-col rounded-sm p-4 shadow-xl transition-[transform,opacity] duration-200 hover:scale-[1.015] hover:-rotate-1 md:mb-0"
    :class="[colorClasses[note.color], { 'sticky-note--done opacity-60': note.done }]"
    :style="{ '--note-x': `${note.positionX}px`, '--note-y': `${note.positionY}px` }"
    @dragstart="emit('drag')"
  >
    <div class="sticky-note-card__toolbar mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <IconButton
          icon="i-lucide-grip"
          :label="$t('pages.notes.move')"
          variant="ghost"
          size="sm"
        />
        <time class="text-[10px] font-semibold tracking-wide uppercase opacity-55">{{ formattedDate }}</time>
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
          @click="emit('patch', { color })"
        />
        <IconButton
          class="ml-1"
          icon="i-lucide-pencil"
          :label="$t('pages.notes.edit')"
          variant="ghost"
          size="sm"
          @click="emit('edit')"
        />
      </div>
    </div>

    <textarea
      v-if="editing"
      :value="note.content"
      class="sticky-note-card__content min-h-24 flex-1 resize-none bg-transparent text-[15px] leading-6 font-medium outline-none"
      :aria-label="$t('pages.notes.content')"
      @blur="emit('save', ($event.target as HTMLTextAreaElement).value)"
    />
    <ol
      v-else
      class="sticky-note-card__items sticky-note__items min-h-24 flex-1 space-y-1.5"
    >
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
        icon="i-lucide-trash-2"
        :label="$t('pages.notes.delete')"
        variant="danger"
        size="sm"
        @click="emit('remove')"
      />
    </footer>
  </article>
</template>

<style scoped>
@media (min-width: 768px) {
  .sticky-note-card {
    position: absolute;
    top: var(--note-y);
    left: var(--note-x);
    width: 15rem;
  }
}
</style>
