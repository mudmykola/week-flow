<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
</script>

<template>
  <main class="login-page flex min-h-screen items-center justify-center p-6">
    <section class="glass-panel w-full max-w-md p-8 text-center">
      <h1 class="font-display text-3xl">WeekFlow</h1>
      <p class="text-secondary mt-3">{{ $t('pages.login.description') }}</p>
      <p
        v-if="route.query.error"
        class="mt-4 text-sm text-red-600"
      >
        {{ $t('pages.login.error') }}
      </p>
      <a
        href="/auth/google"
        class="mt-7 inline-flex rounded-full px-6 py-3 font-medium text-white"
        style="background-color: var(--color-accent)"
      >
        {{ $t('pages.login.google') }}
      </a>
    </section>
  </main>
</template>
