<script setup lang="ts">
import type { ReviewProgressKind } from '~/domain/entities/review'

const props = defineProps<{ taskId: string; subtasks: Array<{ id: string; title: string }>; saving?: boolean }>()
const emit = defineEmits<{
  create: [
    input: {
      taskId: string
      subtaskId: string | null
      kind: ReviewProgressKind
      note: string
      minutes: number | null
      nextStep: string | null
    }
  ]
}>()
const expanded = ref(false)
const note = ref('')
const kind = ref<ReviewProgressKind>('progress')
const subtaskId = ref<string | null>(null)
const minutes = ref<number | null>(null)
const nextStep = ref('')

function submit() {
  if (note.value.trim().length < 2) return
  emit('create', {
    taskId: props.taskId,
    subtaskId: subtaskId.value,
    kind: kind.value,
    note: note.value.trim(),
    minutes: minutes.value || null,
    nextStep: nextStep.value.trim() || null
  })
  note.value = ''
  minutes.value = null
  nextStep.value = ''
  expanded.value = false
}
</script>

<template>
  <form
    class="review-entry-composer"
    :class="{ 'is-expanded': expanded }"
    @submit.prevent="submit"
  >
    <FormInput
      v-model="note"
      class="review-entry-composer__note"
      :placeholder="$t('pages.review.progress.quickPlaceholder')"
      @focus="expanded = true"
    />
    <AppButton
      type="submit"
      size="sm"
      icon="i-lucide-plus"
      :loading="saving"
      :disabled="note.trim().length < 2"
      >{{ $t('pages.review.progress.add') }}</AppButton
    >
    <div
      v-if="expanded"
      class="review-entry-composer__details"
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
        :aria-label="$t('pages.review.progress.subtask')"
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
        v-model="minutes"
        type="number"
        min="1"
        max="1440"
        :placeholder="$t('pages.review.progress.minutes')"
      />
      <FormInput
        v-model="nextStep"
        :placeholder="$t('pages.review.progress.nextStep')"
      />
    </div>
  </form>
</template>

<style scoped>
.review-entry-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--color-panel-border);
}
.review-entry-composer__details {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}
@media (max-width: 760px) {
  .review-entry-composer__details {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .review-entry-composer__details {
    grid-template-columns: 1fr;
  }
}
</style>
