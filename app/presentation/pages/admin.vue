<script setup lang="ts">
const { user } = useUserSession()

if (user.value?.role !== 'admin') {
  throw createError({ statusCode: 403, statusMessage: 'Доступ лише для адміністратора' })
}

const { data: users } = await useFetch('/api/admin/users')

async function updateAccount(account: NonNullable<typeof users.value>[number], patch: { role?: 'user' | 'pm' | 'admin'; disabled?: boolean }) {
  await $fetch(`/api/admin/users/${account.id}`, { method: 'PATCH', body: patch })
  if (patch.role) account.role = patch.role
  if (patch.disabled !== undefined) account.disabledAt = patch.disabled ? Date.now() : null
}
</script>

<template>
  <main class="app-container max-w-5xl">
    <PageHeader title="Користувачі та ролі" description="Призначайте адміністраторів і PM для керування командами." icon="i-lucide-shield-check" />
    <div class="surface-card overflow-hidden">
      <div v-for="account in users" :key="account.id" class="flex flex-wrap items-center gap-3 border-b border-[var(--color-panel-border)] p-3 last:border-0">
        <img v-if="account.avatarUrl" :src="account.avatarUrl" alt="" class="h-10 w-10 rounded-full">
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ account.name }}</p>
          <p class="truncate text-sm text-secondary">{{ account.email }}</p>
        </div>
        <select :value="account.role" aria-label="Роль користувача" class="h-9 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 text-sm" @change="updateAccount(account, { role: ($event.target as HTMLSelectElement).value as 'user' | 'pm' | 'admin' })"><option value="user">Користувач</option><option value="pm">PM / Менеджер</option><option value="admin">Адміністратор</option></select>
        <button class="rounded-lg border border-black/10 p-2" :class="account.disabledAt ? 'text-emerald-500' : 'text-red-500'" :title="account.disabledAt ? 'Активувати' : 'Заблокувати'" @click="updateAccount(account, { disabled: !account.disabledAt })"><UIcon :name="account.disabledAt ? 'i-lucide-user-check' : 'i-lucide-user-x'"/></button>
      </div>
    </div>
  </main>
</template>
