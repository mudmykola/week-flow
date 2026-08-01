<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
</script>

<template>
  <textarea
    v-model="model"
    class="form-textarea ui-control min-h-24 resize-y py-2.5"
    v-bind="$attrs"
  />
</template>
