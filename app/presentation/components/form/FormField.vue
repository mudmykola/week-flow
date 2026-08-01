<script setup lang="ts">
defineProps<{ label?: string; hint?: string; error?: string; forId?: string; icon?: string }>()
</script>

<template>
  <label
    class="form-field ui-field"
    :for="forId"
    ><span
      v-if="label"
      class="form-field__label ui-field__label"
      ><UIcon
        v-if="icon"
        :name="icon"
        class="size-3.5"
      />{{ label }}</span
    ><slot /><span
      v-if="error || hint"
      class="form-field__hint ui-field__hint"
      :class="error ? 'text-[var(--color-danger)]' : ''"
      >{{ error || hint }}</span
    ></label
  >
</template>
