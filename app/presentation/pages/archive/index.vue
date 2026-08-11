<script setup lang="ts">
await navigateTo({ path: '/today', query: { mode: 'archive' } }, { redirectCode: 301 })
</script>

<template>
  <div class="archive-page" />
</template>
