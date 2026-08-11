<script setup lang="ts">
await navigateTo({ path: '/calendar', query: { view: 'week' } }, { redirectCode: 301 })
</script>

<template>
  <div class="timeline-page" />
</template>
