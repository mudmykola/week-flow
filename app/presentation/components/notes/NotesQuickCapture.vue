<script setup lang="ts">
import type { CreateStickyNoteInput, StickyNoteColor } from '~/domain/entities/stickyNote'

const emit = defineEmits<{ create: [input: CreateStickyNoteInput] }>()
const popup = ref<HTMLDetailsElement | null>(null)
const items = ref([''])
const title = ref('')
const noteDate = ref(new Date().toLocaleDateString('en-CA'))
const color = ref<StickyNoteColor>('yellow')
const colors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green']

function close() {
  if (popup.value) popup.value.open = false
}
function submit() {
  const normalized = items.value.map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
  if (!normalized.length) return
  emit('create', {
    title: title.value.trim(),
    content: normalized.join('\n'),
    noteDate: noteDate.value || null,
    color: color.value
  })
  title.value = ''
  items.value = ['']
  close()
}
function focusItem(index: number) {
  nextTick(() => popup.value?.querySelector<HTMLInputElement>(`[data-capture-item="${index}"]`)?.focus())
}
function addItem(after: number) {
  items.value.splice(after + 1, 0, '')
  focusItem(after + 1)
}
function onItemKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addItem(index)
  } else if (event.key === 'Backspace' && !items.value[index] && items.value.length > 1) {
    event.preventDefault()
    items.value.splice(index, 1)
    focusItem(Math.max(0, index - 1))
  }
}
function onPaste(event: ClipboardEvent, index: number) {
  const pasted = event.clipboardData?.getData('text') ?? ''
  const lines = pasted
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return
  event.preventDefault()
  items.value.splice(index, 1, ...lines)
  focusItem(index + lines.length - 1)
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <details
    ref="popup"
    class="notes-quick-capture"
    @keydown="onKeydown"
  >
    <summary class="notes-quick-capture__trigger">
      <UIcon name="i-lucide-plus" />{{ $t('pages.notes.quickCapture') }}
    </summary>
    <div
      class="notes-quick-capture__paper"
      :class="`notes-quick-capture__paper--${color}`"
    >
      <header>
        <UIcon name="i-lucide-sticky-note" /><strong>{{ $t('pages.notes.quickCapture') }}</strong
        ><button
          type="button"
          class="notes-quick-capture__close"
          :aria-label="$t('common.close')"
          @click="close"
        >
          <UIcon name="i-lucide-x" />
        </button>
      </header>
      <label class="notes-quick-capture__field">
        <span>{{ $t('pages.notes.noteTitle') }}</span>
        <input
          v-model="title"
          :placeholder="$t('pages.notes.titlePlaceholder')"
        />
      </label>
      <section class="notes-quick-capture__checklist">
        <div class="notes-quick-capture__checklist-heading">
          <strong>{{ $t('pages.notes.checklist') }}</strong>
          <small>{{ $t('pages.notes.enterHint') }}</small>
        </div>
        <div
          v-for="(item, index) in items"
          :key="index"
          class="notes-quick-capture__item"
        >
          <span>{{ index + 1 }}.</span>
          <input
            v-model="items[index]"
            :data-capture-item="index"
            :autofocus="index === 0"
            :placeholder="index === 0 ? $t('pages.notes.itemPlaceholder') : $t('pages.notes.nextItemPlaceholder')"
            @keydown="onItemKeydown($event, index)"
            @paste="onPaste($event, index)"
          />
          <button
            v-if="items.length > 1"
            type="button"
            :aria-label="$t('pages.notes.removeItem', { index: index + 1 })"
            @click="items.splice(index, 1)"
          >
            <UIcon name="i-lucide-x" />
          </button>
        </div>
        <button
          type="button"
          class="notes-quick-capture__add-item"
          @click="addItem(items.length - 1)"
        >
          <UIcon name="i-lucide-plus" />{{ $t('pages.notes.addItem') }}
        </button>
      </section>
      <div class="notes-quick-capture__options">
        <input
          v-model="noteDate"
          type="date"
        />
        <div :aria-label="$t('pages.notes.color')">
          <button
            v-for="item in colors"
            :key="item"
            type="button"
            :class="[`notes-quick-capture__swatch--${item}`, { 'notes-quick-capture__swatch--active': color === item }]"
            :aria-label="$t(`pages.notes.colors.${item}`)"
            @click="color = item"
          />
        </div>
      </div>
      <footer>
        <small>{{ $t('pages.notes.shortcut') }}</small
        ><AppButton
          class="notes-quick-capture__submit"
          variant="primary"
          icon="i-lucide-plus"
          :disabled="!items.some((item) => item.trim())"
          @click="submit"
          >{{ $t('pages.notes.add') }}</AppButton
        >
      </footer>
    </div>
  </details>
</template>

<style scoped src="~/presentation/assets/css/components/notes/notes-quick-capture.css"></style>
