<script setup lang="ts">
import type { StickyNote, StickyNoteColor, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

const props = defineProps<{ open: boolean; note: StickyNote | null }>()
const emit = defineEmits<{
  close: []
  save: [value: { title: string; content: string }]
  patch: [patch: UpdateStickyNoteInput]
}>()
const title = ref('')
const content = ref('')
const colors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green']

watch(
  () => [props.open, props.note?.id] as const,
  () => {
    if (!props.note) return
    title.value = props.note.title
    content.value = props.note.content
  },
  { immediate: true }
)

function save() {
  if (!content.value.trim()) return
  emit('save', { title: title.value, content: content.value })
}
</script>

<template>
  <Modal
    class="sticky-note-editor-modal"
    :open="open"
    :title="$t('pages.notes.edit')"
    size="md"
    @close="emit('close')"
  >
    <div
      v-if="note"
      class="sticky-note-editor"
      :class="`sticky-note-editor--${note.color}`"
    >
      <div class="sticky-note-editor__tape" />
      <input
        v-model="title"
        class="sticky-note-editor__title"
        :placeholder="$t('pages.notes.titlePlaceholder')"
      />
      <textarea
        v-model="content"
        class="sticky-note-editor__content"
        rows="12"
        :aria-label="$t('pages.notes.content')"
      />
      <div class="sticky-note-editor__meta">
        <label
          ><UIcon name="i-lucide-calendar" /><input
            type="date"
            :value="note.noteDate || ''"
            @change="emit('patch', { noteDate: ($event.target as HTMLInputElement).value || null })"
        /></label>
        <div
          class="sticky-note-editor__colors"
          :aria-label="$t('pages.notes.color')"
        >
          <button
            v-for="color in colors"
            :key="color"
            type="button"
            :class="[
              `sticky-note-editor__color--${color}`,
              { 'sticky-note-editor__color--active': note.color === color }
            ]"
            :aria-label="$t('pages.notes.changeColor', { color: $t(`pages.notes.colors.${color}`) })"
            @click="emit('patch', { color })"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton
        variant="ghost"
        @click="emit('close')"
        >{{ $t('common.cancel') }}</AppButton
      >
      <AppButton
        variant="primary"
        icon="i-lucide-check"
        :disabled="!content.trim()"
        @click="save"
        >{{ $t('common.save') }}</AppButton
      >
    </template>
  </Modal>
</template>

<style scoped>
.sticky-note-editor {
  position: relative;
  display: grid;
  gap: 0.8rem;
  padding: clamp(1.25rem, 3vw, 2rem);
  border: 1px solid rgb(0 0 0 / 0.1);
  border-radius: 0.35rem 1.1rem 0.45rem 0.9rem;
  color: #281f12;
  box-shadow: 0 18px 42px rgb(0 0 0 / 0.14);
}
.sticky-note-editor--yellow {
  background: #fde68a;
}
.sticky-note-editor--pink {
  background: #fecdd3;
}
.sticky-note-editor--blue {
  background: #bae6fd;
}
.sticky-note-editor--green {
  background: #a7f3d0;
}
.sticky-note-editor__tape {
  position: absolute;
  top: -0.55rem;
  left: 50%;
  width: 5rem;
  height: 1.25rem;
  background: rgb(255 255 255 / 0.42);
  transform: translateX(-50%) rotate(-1deg);
}
.sticky-note-editor__title,
.sticky-note-editor__content {
  width: 100%;
  border: 0;
  border-bottom: 1px solid rgb(0 0 0 / 0.13);
  background: transparent;
  outline: none;
}
.sticky-note-editor__title {
  padding: 0.35rem 0;
  font-size: 1.35rem;
  font-weight: 800;
}
.sticky-note-editor__content {
  min-height: 16rem;
  resize: vertical;
  line-height: 1.75;
}
.sticky-note-editor__meta,
.sticky-note-editor__meta label,
.sticky-note-editor__colors {
  display: flex;
  align-items: center;
}
.sticky-note-editor__meta {
  justify-content: space-between;
  gap: 1rem;
}
.sticky-note-editor__meta label {
  gap: 0.4rem;
  opacity: 0.7;
}
.sticky-note-editor__meta input {
  background: transparent;
  font-size: 0.75rem;
}
.sticky-note-editor__colors {
  gap: 0.45rem;
}
.sticky-note-editor__colors button {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
}
.sticky-note-editor__color--yellow {
  background: #f59e0b;
}
.sticky-note-editor__color--pink {
  background: #f43f5e;
}
.sticky-note-editor__color--blue {
  background: #0ea5e9;
}
.sticky-note-editor__color--green {
  background: #10b981;
}
.sticky-note-editor__color--active {
  outline: 2px solid #281f12;
  outline-offset: 2px;
}
</style>
