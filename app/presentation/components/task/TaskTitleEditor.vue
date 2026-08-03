<script setup lang="ts">
const title = defineModel<string>({ required: true })
defineProps<{ placeholder: string }>()
const input = useTemplateRef<HTMLInputElement>('input')
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <input
    ref="input"
    v-model="title"
    type="text"
    class="task-title-editor font-display w-full border-0 bg-transparent text-2xl leading-tight font-bold outline-none placeholder:text-[var(--color-text-secondary)] sm:text-3xl"
    :placeholder="placeholder"
    maxlength="200"
  />
</template>
