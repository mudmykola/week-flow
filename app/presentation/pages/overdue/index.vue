<script setup lang="ts">
await navigateTo({ path: '/today', query: { mode: 'overdue' } }, { redirectCode: 301 })
</script>

<template>
  <div class="overdue-page" />
</template>
