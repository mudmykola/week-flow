<script setup lang="ts">
const model = defineModel<boolean>()
defineProps<{ label?: string }>()
</script>

<template>
  <label class="form-checkbox inline-flex items-center gap-2 text-sm"
    ><input
      v-model="model"
      type="checkbox"
      class="ui-checkbox"
      v-bind="$attrs" /><span v-if="label">{{ label }}</span
    ><slot
  /></label>
</template>
