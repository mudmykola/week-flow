<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
</script>

<template>
  <main class="login-page flex min-h-screen items-center justify-center p-6">
    <section class="glass-panel w-full max-w-md p-8 text-center">
      <h1 class="sr-only">WeekFlow</h1>
      <BrandLogo
        size="lg"
        class="justify-center"
      />
      <p class="mt-3 text-[#666] dark:text-[#b3b3b3]">{{ $t('pages.login.description') }}</p>
      <p
        v-if="route.query.error"
        class="mt-4 text-sm text-red-600"
      >
        {{ $t('pages.login.error') }}
      </p>
      <a
        href="/auth/google"
        class="mt-7 inline-flex rounded-full px-6 py-3 font-medium text-white"
        style="background-color: #b93800"
      >
        {{ $t('pages.login.google') }}
      </a>
    </section>
  </main>
</template>
