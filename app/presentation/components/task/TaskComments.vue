<script setup lang="ts">
import type { TaskComment } from '~/application/composables/useTaskDetails'

const props = defineProps<{ taskId: string; modelValue: TaskComment[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: TaskComment[]] }>()
const { t } = useI18n()
const value = ref('')
const sending = ref(false)
const error = ref(false)
async function send() {
  const body = value.value.trim()
  if (!body || sending.value) return
  sending.value = true
  error.value = false
  try {
    await $fetch(`/api/tasks/${props.taskId}/comments`, { method: 'POST', body: { body } })
    emit('update:modelValue', [
      ...props.modelValue,
      { id: crypto.randomUUID(), body, authorName: t('common.you'), createdAt: Date.now() }
    ])
    value.value = ''
  } catch {
    error.value = true
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="task-comments rounded-2xl border border-[var(--color-panel-border)] p-4">
    <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
      <UIcon name="i-lucide-messages-square" />{{ $t('task.comments') }}
      <span class="count-badge">{{ modelValue.length }}</span>
    </h3>
    <div class="app-scrollbar max-h-52 space-y-2 overflow-y-auto">
      <article
        v-for="comment in modelValue"
        :key="comment.id"
        class="rounded-xl bg-[var(--color-bg-alt)] p-3 text-sm"
      >
        <p class="whitespace-pre-wrap">{{ comment.body }}</p>
        <span class="text-secondary mt-1 block text-[11px]">{{ comment.authorName }}</span>
      </article>
    </div>
    <div class="mt-3 flex gap-2">
      <FormInput
        v-model="value"
        :placeholder="$t('task.comment')"
        @keyup.enter="send"
      /><IconButton
        icon="i-lucide-send"
        :label="$t('common.send')"
        :disabled="sending"
        @click="send"
      />
    </div>
    <p
      v-if="error"
      class="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-danger)]"
      role="alert"
    >
      <UIcon name="i-lucide-circle-alert" />{{ $t('task.commentError') }}
    </p>
  </section>
</template>
