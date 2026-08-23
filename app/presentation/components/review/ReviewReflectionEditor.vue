<script setup lang="ts">
import type { ReviewReflection } from '~/domain/entities/review'
const props = defineProps<{ modelValue: ReviewReflection; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: ReviewReflection] }>()
const fields = ['result', 'progress', 'blockers', 'decisions', 'nextFocus'] as const
function update(field: keyof ReviewReflection, value: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<template>
  <section class="review-reflection-editor surface-card">
    <header>
      <div>
        <h2><UIcon name="i-lucide-notebook-pen" />{{ $t('pages.review.close.reflection') }}</h2>
        <p>{{ $t('pages.review.close.reflectionHint') }}</p>
      </div>
    </header>
    <div class="review-reflection-editor__fields">
      <label
        v-for="field in fields"
        :key="field"
        ><span>{{ $t(`pages.review.close.fields.${field}`) }}</span
        ><FormTextarea
          :model-value="modelValue[field]"
          :disabled="disabled"
          rows="2"
          :placeholder="$t(`pages.review.close.placeholders.${field}`)"
          @update:model-value="update(field, $event ?? '')"
      /></label>
    </div>
  </section>
</template>

<style scoped>
.review-reflection-editor {
  padding: 0.75rem;
  margin-top: 0.65rem;
}
.review-reflection-editor h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 800;
}
.review-reflection-editor p {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}
.review-reflection-editor__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.65rem;
}
.review-reflection-editor label:last-child {
  grid-column: 1/-1;
}
.review-reflection-editor label > span {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
  font-weight: 700;
}
@media (max-width: 650px) {
  .review-reflection-editor__fields {
    grid-template-columns: 1fr;
  }
  .review-reflection-editor label:last-child {
    grid-column: auto;
  }
}
</style>
