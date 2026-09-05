<script setup lang="ts">
import { createReviewProgress } from '~/data/repositories/reviewsRepository'
import type { Subtask } from '~/domain/entities/task'
import type { ReviewProgressKind } from '~/domain/entities/review'
import { localDateKey } from '~/domain/services/today'

const props = defineProps<{ taskId: string; subtasks: Subtask[] }>()
const note = ref('')
const minutes = ref<number | null>(null)
const subtaskId = ref<string | null>(null)
const kind = ref<ReviewProgressKind>('progress')
const nextStep = ref('')
const saving = ref(false)
const saved = ref(false)
const { report } = useApiFeedback()
const { t } = useI18n()

async function submit() {
  if (note.value.trim().length < 2 || saving.value) return
  saving.value = true
  saved.value = false
  try {
    await createReviewProgress({
      taskId: props.taskId,
      subtaskId: subtaskId.value,
      workDate: localDateKey(),
      kind: kind.value,
      note: note.value.trim(),
      minutes: minutes.value || null,
      nextStep: nextStep.value.trim() || null
    })
    note.value = ''
    minutes.value = null
    nextStep.value = ''
    saved.value = true
    useToast().add({ title: t('task.workLogSaved'), color: 'success' })
  } catch (error) {
    report(error, t('pages.review.progress.saveFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="task-work-log-composer rounded-2xl border border-[var(--color-panel-border)] p-4">
    <header class="mb-3 flex items-center justify-between gap-3">
      <div>
        <strong class="flex items-center gap-2"><UIcon name="i-lucide-notebook-pen" />{{ $t('task.workLog') }}</strong>
        <p class="text-secondary text-xs">{{ $t('task.workLogHint') }}</p>
      </div>
      <SemanticBadge
        v-if="saved"
        tone="success"
        icon="i-lucide-check"
        >{{ $t('task.workLogSaved') }}</SemanticBadge
      >
    </header>
    <form
      class="grid gap-2 md:grid-cols-2"
      @submit.prevent="submit"
    >
      <FormSelect
        v-model="kind"
        :aria-label="$t('pages.review.progress.kind')"
      >
        <option value="progress">{{ $t('pages.review.progress.kindValue.progress') }}</option>
        <option value="result">{{ $t('pages.review.progress.kindValue.result') }}</option>
        <option value="decision">{{ $t('pages.review.progress.kindValue.decision') }}</option>
        <option value="blocker">{{ $t('pages.review.progress.kindValue.blocker') }}</option>
      </FormSelect>
      <FormSelect
        v-if="subtasks.length"
        v-model="subtaskId"
        ><option :value="null">{{ $t('pages.review.progress.wholeTask') }}</option>
        <option
          v-for="item in subtasks"
          :key="item.id"
          :value="item.id"
        >
          {{ item.title }}
        </option></FormSelect
      >
      <FormInput
        v-model="note"
        class="md:col-span-2"
        :placeholder="$t('task.workLogPlaceholder')"
      />
      <FormInput
        v-model="nextStep"
        :placeholder="$t('pages.review.progress.nextStep')"
      />
      <FormInput
        v-model="minutes"
        type="number"
        min="1"
        max="1440"
        :placeholder="$t('pages.review.progress.minutes')"
      />
      <AppButton
        class="md:col-span-2 md:justify-self-end"
        type="submit"
        icon="i-lucide-plus"
        :loading="saving"
        :disabled="note.trim().length < 2"
        >{{ $t('task.recordWork') }}</AppButton
      >
    </form>
  </section>
</template>
