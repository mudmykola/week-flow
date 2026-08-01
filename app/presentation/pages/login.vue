<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-6">
    <section class="glass-panel w-full max-w-md p-8 text-center">
      <h1 class="font-display text-3xl">WeekFlow</h1>
      <p class="mt-3 text-secondary">Увійдіть, щоб керувати власними проєктами й задачами.</p>
      <p v-if="route.query.error" class="mt-4 text-sm text-red-600">Не вдалося увійти через Google.</p>
      <a
        href="/auth/google"
        class="mt-7 inline-flex rounded-full px-6 py-3 font-medium text-white"
        style="background-color: var(--color-accent)"
      >
        Увійти через Google
      </a>
    </section>
  </main>
</template>
