<script setup lang="ts">
const colorMode = useColorMode()
const { data: settings, status } = await useFetch('/api/settings')
const saving = ref(false)
const toast = useToast()
const { t, setLocale } = useI18n()
async function save() {
  if (!settings.value) return
  saving.value = true
  try {
    await $fetch('/api/settings', { method: 'PATCH', body: settings.value })
    colorMode.preference = settings.value.theme
    await setLocale(settings.value.locale === 'en' ? 'en' : 'uk')
    toast.add({ title: t('settings.saved'), color: 'success' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="settings-page app-container max-w-3xl">
    <PageHeader
      :title="$t('settings.title')"
      :description="$t('settings.description')"
      icon="i-lucide-settings-2"
    />
    <USkeleton
      v-if="status === 'pending'"
      class="h-96 rounded-2xl"
    />
    <section
      v-else-if="settings"
      class="surface-card divide-y divide-[var(--color-panel-border)]"
    >
      <div class="space-y-4 p-4">
        <div>
          <h2 class="font-display text-base">{{ $t('settings.interface') }}</h2>
          <p class="text-secondary mt-0.5 text-xs">{{ $t('settings.interfaceHint') }}</p>
        </div>
        <FormField :label="$t('settings.theme')"
          ><FormSelect v-model="settings.theme"
            ><option value="system">{{ $t('settings.themeValue.system') }}</option>
            <option value="light">{{ $t('settings.themeValue.light') }}</option>
            <option value="dark">{{ $t('settings.themeValue.dark') }}</option></FormSelect
          ></FormField
        ><FormField :label="$t('settings.language')"
          ><FormSelect v-model="settings.locale"
            ><option value="uk">{{ $t('language.uk') }}</option>
            <option value="en">{{ $t('language.en') }}</option></FormSelect
          ></FormField
        ><label class="flex items-center justify-between rounded-lg bg-[var(--color-bg-alt)] p-3"
          ><span
            ><strong class="block text-sm">{{ $t('settings.notifications') }}</strong
            ><span class="text-secondary text-xs">{{ $t('settings.notificationsHint') }}</span></span
          ><USwitch v-model="settings.notifications"
        /></label>
      </div>
      <div class="p-4">
        <h2 class="font-display text-base">{{ $t('settings.data') }}</h2>
        <p class="text-secondary mt-0.5 text-xs">{{ $t('settings.dataHint') }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            to="/api/export?format=json"
            external
            size="sm"
            variant="soft"
            icon="i-lucide-file-json"
            >{{ $t('settings.exportJson') }}</UButton
          ><UButton
            to="/api/export?format=csv"
            external
            size="sm"
            variant="soft"
            icon="i-lucide-file-spreadsheet"
            >{{ $t('settings.exportCsv') }}</UButton
          >
        </div>
      </div>
      <div class="flex justify-end p-4">
        <UButton
          size="sm"
          :loading="saving"
          icon="i-lucide-save"
          @click="save"
          >{{ $t('settings.saveChanges') }}</UButton
        >
      </div>
    </section>
  </div>
</template>
