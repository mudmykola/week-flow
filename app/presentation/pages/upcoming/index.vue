<script setup lang="ts">
await navigateTo({ path: '/today', query: { mode: 'upcoming' } }, { redirectCode: 301 })
</script>

<template>
  <div class="upcoming-page" />
</template>
