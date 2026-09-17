<script setup lang="ts">
import type { ReviewReflection } from '~/domain/entities/review'
const props = defineProps<{ modelValue: ReviewReflection; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: ReviewReflection] }>()
const primaryFields = ['result', 'nextFocus', 'blockers'] as const
const advancedFields = ['progress', 'decisions'] as const
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
        v-for="field in primaryFields"
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
    <details class="review-reflection-editor__advanced">
      <summary><UIcon name="i-lucide-sliders-horizontal" />{{ $t('pages.review.v2.advancedReflection') }}</summary>
      <div class="review-reflection-editor__fields">
        <label
          v-for="field in advancedFields"
          :key="field"
        >
          <span>{{ $t(`pages.review.close.fields.${field}`) }}</span>
          <FormTextarea
            :model-value="modelValue[field]"
            :disabled="disabled"
            rows="2"
            :placeholder="$t(`pages.review.close.placeholders.${field}`)"
            @update:model-value="update(field, $event ?? '')"
          />
        </label>
      </div>
    </details>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-reflection-editor.css"></style>
