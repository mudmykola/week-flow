<script setup lang="ts">
import type { CreateStickyNoteInput, StickyNoteColor } from '~/domain/entities/stickyNote'

const emit = defineEmits<{ create: [input: CreateStickyNoteInput] }>()
const content = ref('')
const title = ref('')
const noteDate = ref(new Date().toLocaleDateString('en-CA'))
const color = ref<StickyNoteColor>('yellow')
const expanded = ref(false)
const colors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green']

function submit() {
  const items = content.value
    .split('\n')
    .map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
  if (!items.length) return
  emit('create', {
    title: title.value.trim(),
    content: items.join('\n'),
    noteDate: noteDate.value || null,
    color: color.value
  })
  title.value = ''
  content.value = ''
  expanded.value = false
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <section
    class="notes-quick-capture surface-card p-3 sm:p-4"
    @keydown="onKeydown"
  >
    <div class="notes-quick-capture__main flex items-start gap-3">
      <UIcon
        name="i-lucide-sticky-note"
        class="mt-3 size-5 shrink-0 text-[var(--color-accent)]"
      />
      <div class="min-w-0 flex-1 space-y-2">
        <FormInput
          v-if="expanded"
          v-model="title"
          :placeholder="$t('pages.notes.titlePlaceholder')"
        />
        <FormTextarea
          v-model="content"
          :rows="expanded ? 4 : 1"
          :placeholder="$t('pages.notes.placeholder')"
          @focus="expanded = true"
        />
      </div>
      <AppButton
        variant="primary"
        icon="i-lucide-plus"
        :disabled="!content.trim()"
        @click="submit"
      >
        <span class="hidden sm:inline">{{ $t('pages.notes.add') }}</span>
      </AppButton>
    </div>
    <div
      v-if="expanded"
      class="notes-quick-capture__meta mt-3 flex flex-wrap items-center gap-2 pl-8"
    >
      <FormInput
        v-model="noteDate"
        type="date"
        class="w-40"
      />
      <div
        class="flex items-center gap-1"
        :aria-label="$t('pages.notes.color')"
      >
        <button
          v-for="item in colors"
          :key="item"
          type="button"
          class="size-6 rounded-full border border-black/15"
          :class="[`note-swatch--${item}`, color === item ? 'ring-2 ring-[var(--color-accent)] ring-offset-2' : '']"
          :aria-label="$t(`pages.notes.colors.${item}`)"
          @click="color = item"
        />
      </div>
      <span class="text-secondary ml-auto text-xs">{{ $t('pages.notes.shortcut') }}</span>
    </div>
  </section>
</template>

<style scoped>
.note-swatch--yellow {
  background: #fde68a;
}
.note-swatch--pink {
  background: #fecdd3;
}
.note-swatch--blue {
  background: #bae6fd;
}
.note-swatch--green {
  background: #a7f3d0;
}
</style>
