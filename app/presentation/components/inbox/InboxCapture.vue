<script setup lang="ts">
defineProps<{ modelValue: string; saving: boolean }>()
defineEmits<{ 'update:modelValue': [value: string]; submit: []; keydown: [event: KeyboardEvent] }>()
</script>

<template>
  <section class="inbox-capture inbox-workspace__capture">
    <div class="inbox-workspace__capture-icon"><UIcon name="i-lucide-sparkles" /></div>
    <textarea
      :value="modelValue"
      rows="3"
      :placeholder="$t('pages.inbox.capturePlaceholder')"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="$emit('keydown', $event)"
    />
    <div class="inbox-workspace__capture-footer">
      <span>{{ $t('pages.inbox.captureHint') }}</span>
      <AppButton
        :loading="saving"
        icon="i-lucide-arrow-down-to-line"
        @click="$emit('submit')"
      >
        {{ $t('pages.inbox.capture') }}
      </AppButton>
    </div>
  </section>
</template>
