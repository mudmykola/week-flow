<script setup lang="ts">
const colorMode = useColorMode()
const { data: settings, status } = await useFetch('/api/settings')
const saving = ref(false)
const toast = useToast()
async function save() { if (!settings.value) return; saving.value = true; try { await $fetch('/api/settings', { method: 'PATCH', body: settings.value }); colorMode.preference = settings.value.theme; toast.add({ title: 'Налаштування збережено', color: 'success' }) } finally { saving.value = false } }
</script>

<template><div class="app-container max-w-3xl"><PageHeader title="Налаштування" description="Персоналізація вигляду, мови та даних." icon="i-lucide-settings-2" />
  <USkeleton v-if="status === 'pending'" class="h-96 rounded-2xl" />
  <section v-else-if="settings" class="surface-card divide-y divide-[var(--color-panel-border)]">
    <div class="space-y-4 p-4"><div><h2 class="font-display text-base">Інтерфейс</h2><p class="mt-0.5 text-xs text-secondary">Вигляд WeekFlow на цьому акаунті.</p></div><label class="block"><span class="mb-1 block text-xs text-secondary">Тема</span><select v-model="settings.theme" class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"><option value="system">Системна</option><option value="light">Світла</option><option value="dark">Темна</option></select></label><label class="block"><span class="mb-1 block text-xs text-secondary">Мова</span><select v-model="settings.locale" class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"><option value="uk">Українська</option><option value="en">English</option></select></label><label class="flex items-center justify-between rounded-lg bg-[var(--color-bg-alt)] p-3"><span><strong class="block text-sm">Сповіщення</strong><span class="text-xs text-secondary">Нагадування та важливі зміни</span></span><USwitch v-model="settings.notifications" /></label></div>
    <div class="p-4"><h2 class="font-display text-base">Дані</h2><p class="mt-0.5 text-xs text-secondary">Завантажте копію задач і проєктів.</p><div class="mt-3 flex flex-wrap gap-2"><UButton to="/api/export?format=json" external size="sm" variant="soft" icon="i-lucide-file-json">Експорт JSON</UButton><UButton to="/api/export?format=csv" external size="sm" variant="soft" icon="i-lucide-file-spreadsheet">Експорт CSV</UButton></div></div>
    <div class="flex justify-end p-4"><UButton size="sm" :loading="saving" icon="i-lucide-save" @click="save">Зберегти зміни</UButton></div>
  </section>
</div></template>
