<script setup lang="ts">
import type { TaskPriority, TaskRecurrence } from '~/domain/entities/task'

type Template = {
  id: string
  title: string
  note: string
  priority: TaskPriority
  recurrence: TaskRecurrence | null
  tags: string[]
}

const colorMode = useColorMode()
const { data: settings, status } = await useFetch('/api/settings')
const saving = ref(false)
const toast = useToast()
const { report } = useApiFeedback()
const { t, setLocale } = useI18n()
const { user, clear } = useUserSession()
const confirmEmail = ref('')
const deletingAccount = ref(false)

const templates = useLocalStorage<Template[]>('weekflow-task-templates', [
  {
    id: 'weekly-review',
    title: t('pages.templates.defaultReview'),
    note: t('pages.templates.defaultReviewNote'),
    priority: 'medium',
    recurrence: 'weekly',
    tags: ['review']
  },
  {
    id: 'client-call',
    title: t('pages.templates.defaultCall'),
    note: t('pages.templates.defaultCallNote'),
    priority: 'high',
    recurrence: null,
    tags: ['client']
  }
])
const templateForm = reactive({ title: '', note: '', priority: 'medium' as TaskPriority })
function addTemplate() {
  if (!templateForm.title.trim()) return
  templates.value.push({
    id: crypto.randomUUID(),
    title: templateForm.title.trim(),
    note: templateForm.note.trim(),
    priority: templateForm.priority,
    recurrence: null,
    tags: []
  })
  templateForm.title = ''
  templateForm.note = ''
}
function removeTemplate(id: string) {
  templates.value = templates.value.filter((item) => item.id !== id)
}
async function save() {
  if (!settings.value) return
  saving.value = true
  try {
    await $fetch('/api/settings', { method: 'PATCH', body: settings.value })
    colorMode.preference = settings.value.theme
    await setLocale(settings.value.locale === 'en' ? 'en' : 'uk')
    if (settings.value.notifications && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    toast.add({ title: t('settings.saved'), color: 'success' })
  } catch (error) {
    report(error)
  } finally {
    saving.value = false
  }
}

async function deleteAccount() {
  if (!user.value?.email || confirmEmail.value.trim().toLowerCase() !== user.value.email.toLowerCase()) return
  deletingAccount.value = true
  try {
    await $fetch('/api/account', {
      method: 'DELETE',
      body: { email: confirmEmail.value.trim(), acknowledgeDataLoss: true }
    })
    await clear()
    await navigateTo('/login')
  } catch (error) {
    report(error)
  } finally {
    deletingAccount.value = false
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
      <div class="space-y-3 p-4">
        <div>
          <h2 class="font-display text-base text-red-500">{{ $t('settings.dangerZone') }}</h2>
          <p class="text-secondary mt-0.5 text-xs">{{ $t('settings.deleteHint') }}</p>
        </div>
        <FormField :label="$t('settings.confirmEmail')">
          <FormInput
            v-model="confirmEmail"
            type="email"
            :placeholder="user?.email || ''"
            autocomplete="off"
          />
        </FormField>
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          :loading="deletingAccount"
          :disabled="!user?.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()"
          @click="deleteAccount"
        >
          {{ $t('settings.deleteAccount') }}
        </UButton>
      </div>
      <div class="p-4">
        <h2 class="font-display text-base">{{ $t('nav.templates') }}</h2>
        <p class="text-secondary mt-0.5 text-xs">{{ $t('pages.templates.description') }}</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <article
            v-for="template in templates"
            :key="template.id"
            class="surface-card group flex items-start justify-between gap-2 p-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ template.title }}</p>
              <p class="text-secondary mt-0.5 truncate text-xs">{{ template.note || $t('common.noDescription') }}</p>
            </div>
            <button
              class="text-secondary opacity-0 group-hover:opacity-100"
              :title="$t('pages.templates.delete')"
              @click="removeTemplate(template.id)"
            >
              <UIcon name="i-lucide-trash-2" />
            </button>
          </article>
        </div>
        <div class="mt-3 flex flex-wrap items-end gap-2">
          <FormInput
            v-model="templateForm.title"
            class="min-w-[12rem] flex-1"
            :placeholder="$t('task.name')"
          />
          <FormInput
            v-model="templateForm.note"
            class="min-w-[12rem] flex-1"
            :placeholder="$t('pages.templates.descriptionLabel')"
          />
          <FormSelect
            v-model="templateForm.priority"
            class="w-36"
          >
            <option value="low">{{ $t('task.priorityValue.low') }}</option>
            <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
            <option value="high">{{ $t('task.priorityValue.high') }}</option>
            <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option>
          </FormSelect>
          <UButton
            size="sm"
            icon="i-lucide-save"
            @click="addTemplate"
            >{{ $t('pages.templates.save') }}</UButton
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
