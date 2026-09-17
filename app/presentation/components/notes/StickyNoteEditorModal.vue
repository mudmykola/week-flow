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

<style scoped src="~/presentation/assets/css/components/notes/sticky-note-editor-modal.css"></style>
