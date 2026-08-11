<script setup lang="ts">
await navigateTo({ path: '/calendar', query: { view: 'timeline' } }, { redirectCode: 301 })
</script>

<template>
  <div class="timeline-page" />
</template>
