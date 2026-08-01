<script setup lang="ts">
const route = useRoute()
const pending = ref(false)
const error = ref('')

async function accept() {
  pending.value = true
  try {
    const result = await $fetch<{ projectId: string }>(`/api/invitations/${route.params.token}/accept`, { method: 'POST' })
    await navigateTo(`/?project=${result.projectId}`)
  } catch {
    error.value = 'Запрошення недійсне, прострочене або призначене іншому акаунту.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-lg items-center px-6">
    <div class="glass-panel w-full p-8 text-center">
      <UIcon name="i-lucide-user-plus" class="mx-auto mb-4 size-10 text-[var(--color-accent)]" />
      <h1 class="font-display text-2xl">Запрошення до проєкту</h1>
      <p class="mt-2 text-secondary">Прийміть запрошення поточним Google-акаунтом.</p>
      <p v-if="error" class="mt-4 text-sm text-red-500">{{ error }}</p>
      <UButton class="mt-6" :loading="pending" @click="accept">Прийняти</UButton>
    </div>
  </div>
</template>
