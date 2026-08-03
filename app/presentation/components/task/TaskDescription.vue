<script setup lang="ts">
const value = defineModel<string>({ required: true })
const preview = ref(false)

function inlineMarkdown(source: string) {
  const escaped = source
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/(^|\s)@([\p{L}\d._-]+)/gu, '$1<span class="task-description__mention">@$2</span>')
  return escaped.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

const html = computed(() =>
  value.value
    .split('\n')
    .map((line) => {
      if (/^- \[[ xX]] /.test(line)) {
        const done = /^- \[[xX]] /.test(line)
        return `<div class="task-description__check ${done ? 'task-description__check--done' : ''}">✓ ${inlineMarkdown(line.slice(6))}</div>`
      }
      if (/^[-*] /.test(line)) return `<li>${inlineMarkdown(line.slice(2))}</li>`
      if (/^\d+\. /.test(line)) return `<li>${inlineMarkdown(line.replace(/^\d+\. /, ''))}</li>`
      return line ? `<p>${inlineMarkdown(line)}</p>` : '<br>'
    })
    .join('')
)
</script>

<template>
  <section
    class="task-description rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4"
  >
    <header class="mb-3 flex items-center justify-between gap-3">
      <h3 class="flex items-center gap-2 text-sm font-semibold">
        <UIcon name="i-lucide-file-text" />{{ $t('task.note') }}
      </h3>
      <button
        type="button"
        class="text-secondary inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs hover:bg-[var(--color-bg-alt)]"
        @click="preview = !preview"
      >
        <UIcon :name="preview ? 'i-lucide-pencil' : 'i-lucide-eye'" />
        {{ preview ? $t('task.editDescription') : $t('task.previewDescription') }}
      </button>
    </header>
    <div
      v-if="preview"
      class="task-description__preview min-h-32 text-sm leading-6"
      v-html="html"
    />
    <FormTextarea
      v-else
      v-model="value"
      rows="7"
      :placeholder="$t('task.markdownPlaceholder')"
    />
    <p class="text-secondary mt-2 text-[11px]">{{ $t('task.markdownHint') }}</p>
  </section>
</template>
