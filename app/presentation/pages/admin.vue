<script setup lang="ts">
const { user } = useUserSession()

if (user.value?.role !== 'admin') {
  throw createError({ statusCode: 403, statusMessage: 'Доступ лише для адміністратора' })
}

const { data: users } = await useFetch('/api/admin/users')

async function updateAccount(account: NonNullable<typeof users.value>[number], patch: { role?: 'user' | 'admin'; disabled?: boolean }) {
  await $fetch(`/api/admin/users/${account.id}`, { method: 'PATCH', body: patch })
  if (patch.role) account.role = patch.role
  if (patch.disabled !== undefined) account.disabledAt = patch.disabled ? Date.now() : null
}
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-10">
    <header class="mb-8 flex items-center justify-between">
      <h1 class="font-display text-3xl">Користувачі</h1>
      <NuxtLink to="/" class="rounded-full border border-black/10 px-4 py-2 text-sm text-secondary">
        ← Дошка
      </NuxtLink>
    </header>
    <div class="glass-panel overflow-hidden">
      <div v-for="account in users" :key="account.id" class="flex items-center gap-4 border-b border-black/[0.06] p-4 last:border-0">
        <img v-if="account.avatarUrl" :src="account.avatarUrl" alt="" class="h-10 w-10 rounded-full">
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ account.name }}</p>
          <p class="truncate text-sm text-secondary">{{ account.email }}</p>
        </div>
        <span class="rounded-full bg-black/[0.05] px-3 py-1 text-xs">{{ account.role }}</span>
        <button class="rounded-lg border border-black/10 p-2 text-secondary" :title="account.role === 'admin' ? 'Зробити користувачем' : 'Зробити адміністратором'" @click="updateAccount(account, { role: account.role === 'admin' ? 'user' : 'admin' })"><UIcon name="i-lucide-shield"/></button>
        <button class="rounded-lg border border-black/10 p-2" :class="account.disabledAt ? 'text-emerald-500' : 'text-red-500'" :title="account.disabledAt ? 'Активувати' : 'Заблокувати'" @click="updateAccount(account, { disabled: !account.disabledAt })"><UIcon :name="account.disabledAt ? 'i-lucide-user-check' : 'i-lucide-user-x'"/></button>
      </div>
    </div>
  </main>
</template>
