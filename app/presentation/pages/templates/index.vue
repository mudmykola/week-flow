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
const { t } = useI18n()
const templates = useLocalStorage<Template[]>('weekflow-task-templates', [])
const draft = reactive({
  title: '',
  note: '',
  priority: 'medium' as TaskPriority,
  recurrence: null as TaskRecurrence | null,
  tags: ''
})
function save() {
  if (!draft.title.trim()) return
  templates.value = [
    ...templates.value,
    {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      note: draft.note.trim(),
      priority: draft.priority,
      recurrence: draft.recurrence,
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
  ]
  Object.assign(draft, { title: '', note: '', priority: 'medium', recurrence: null, tags: '' })
}
</script>

<template>
  <div class="templates-page app-container max-w-6xl">
    <PageHeader
      :title="$t('nav.templates')"
      :description="$t('pages.templates.description')"
      icon="i-lucide-layout-template"
    />
    <div class="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section class="surface-card space-y-3 p-4">
        <h2 class="font-semibold">{{ $t('pages.templates.new') }}</h2>
        <FormField :label="$t('task.name')"><FormInput v-model="draft.title" /></FormField>
        <FormField :label="$t('pages.templates.descriptionLabel')"
          ><FormTextarea
            v-model="draft.note"
            :rows="4"
        /></FormField>
        <div class="grid grid-cols-2 gap-2">
          <FormField :label="$t('task.priority')"
            ><FormSelect v-model="draft.priority"
              ><option value="low">{{ $t('task.priorityValue.low') }}</option>
              <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
              <option value="high">{{ $t('task.priorityValue.high') }}</option>
              <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option></FormSelect
            ></FormField
          >
          <FormField :label="$t('task.recurrence')"
            ><FormSelect v-model="draft.recurrence"
              ><option :value="null">{{ $t('task.noRecurrence') }}</option>
              <option value="daily">{{ $t('task.recurrenceValue.daily') }}</option>
              <option value="weekly">{{ $t('task.recurrenceValue.weekly') }}</option>
              <option value="monthly">{{ $t('task.recurrenceValue.monthly') }}</option></FormSelect
            ></FormField
          >
        </div>
        <FormField :label="$t('task.tags')"
          ><FormInput
            v-model="draft.tags"
            :placeholder="$t('task.tagsPlaceholder')"
        /></FormField>
        <AppButton
          class="w-full"
          variant="primary"
          icon="i-lucide-save"
          :disabled="!draft.title.trim()"
          @click="save"
          >{{ $t('pages.templates.save') }}</AppButton
        >
      </section>
      <section class="grid content-start gap-3 sm:grid-cols-2">
        <article
          v-for="template in templates"
          :key="template.id"
          class="surface-card p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-semibold">{{ template.title }}</h2>
            <IconButton
              icon="i-lucide-trash-2"
              :label="$t('pages.templates.delete')"
              @click="templates = templates.filter((item) => item.id !== template.id)"
            />
          </div>
          <p
            v-if="template.note"
            class="text-secondary mt-2 text-sm"
          >
            {{ template.note }}
          </p>
          <div class="mt-3 flex flex-wrap gap-1">
            <span class="count-badge">{{ $t(`task.priorityValue.${template.priority}`) }}</span
            ><span
              v-for="tag in template.tags"
              :key="tag"
              class="count-badge"
              >#{{ tag }}</span
            >
          </div>
        </article>
        <EmptyState
          v-if="!templates.length"
          icon="i-lucide-layout-template"
          :title="$t('pages.templates.new')"
          :description="$t('pages.templates.description')"
        />
      </section>
    </div>
  </div>
</template>
