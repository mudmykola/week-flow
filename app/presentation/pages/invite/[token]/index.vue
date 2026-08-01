<script setup lang="ts">
const route = useRoute()
const pending = ref(false)
const error = ref('')
const { t } = useI18n()

async function accept() {
  pending.value = true
  try {
    const result = await $fetch<{ projectId: string }>(`/api/invitations/${route.params.token}/accept`, {
      method: 'POST'
    })
    await navigateTo(`/?project=${result.projectId}`)
  } catch {
    error.value = t('pages.invite.error')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="invite-token-page mx-auto flex min-h-[70vh] max-w-lg items-center px-6">
    <div class="glass-panel w-full p-8 text-center">
      <UIcon
        name="i-lucide-user-plus"
        class="mx-auto mb-4 size-10 text-[var(--color-accent)]"
      />
      <h1 class="font-display text-2xl">{{ $t('pages.invite.title') }}</h1>
      <p class="text-secondary mt-2">{{ $t('pages.invite.description') }}</p>
      <p
        v-if="error"
        class="mt-4 text-sm text-red-500"
      >
        {{ error }}
      </p>
      <UButton
        class="mt-6"
        :loading="pending"
        @click="accept"
        >{{ $t('pages.invite.accept') }}</UButton
      >
    </div>
  </div>
</template>
