<script setup lang="ts">
import type { Project } from '~/domain/entities/project'

const props = defineProps<{
  open: boolean
  projects: Project[]
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { name: string; color: string }]
  delete: [id: string]
}>()

const name = ref('')
const color = ref('#fe5011')
const inviteProjectId = ref<string | null>(null)
const inviteEmail = ref('')
const inviteUrl = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = ''
    color.value = '#fe5011'
  }
)

function submit() {
  if (!name.value.trim()) return
  emit('save', { name: name.value.trim(), color: color.value })
}

async function invite() {
  if (!inviteProjectId.value || !inviteEmail.value.trim()) return
  const result = await $fetch<{ url: string }>(`/api/projects/${inviteProjectId.value}/invitations`, {
    method: 'POST',
    body: { email: inviteEmail.value.trim(), role: 'editor' }
  })
  inviteUrl.value = `${window.location.origin}${result.url}`
  await navigator.clipboard.writeText(inviteUrl.value)
}
</script>

<template>
  <Modal
    class="project-editor"
    :open="open"
    :title="$t('projectEditor.title')"
    @close="emit('close')"
  >
    <div
      v-if="projects.length"
      class="mb-4 flex flex-col gap-2"
    >
      <div
        v-for="project in projects"
        :key="project.id"
        class="flex items-center justify-between rounded-lg px-3 py-2.5"
        style="background-color: rgba(0, 0, 0, 0.03)"
      >
        <span class="flex items-center gap-2.5 text-base">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: project.color }"
          />
          {{ project.name }}
        </span>
        <IconButton
          icon="i-lucide-trash-2"
          :label="$t('projectEditor.delete')"
          variant="danger"
          size="sm"
          @click="emit('delete', project.id)"
        />
      </div>
    </div>
    <p
      v-else
      class="text-secondary mb-6 text-sm"
    >
      {{ $t('projectEditor.empty') }}
    </p>

    <div
      v-if="projects.length"
      class="mb-4 rounded-lg border border-black/10 p-3"
    >
      <h3 class="mb-3 flex items-center gap-2 font-medium">
        <UIcon name="i-lucide-user-plus" /> {{ $t('projectEditor.invite') }}
      </h3>
      <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <FormSelect
          v-model="inviteProjectId"
          size="sm"
          ><option :value="null">{{ $t('projectEditor.select') }}</option>
          <option
            v-for="project in projects"
            :key="project.id"
            :value="project.id"
          >
            {{ project.name }}
          </option></FormSelect
        ><FormInput
          v-model="inviteEmail"
          type="email"
          size="sm"
          placeholder="email@gmail.com"
        /><AppButton
          variant="primary"
          size="sm"
          @click="invite"
          >{{ $t('projectEditor.copyInvite') }}</AppButton
        >
      </div>
      <p
        v-if="inviteUrl"
        class="text-secondary mt-2 truncate text-xs"
      >
        {{ inviteUrl }}
      </p>
    </div>

    <div class="grid grid-cols-[1fr_5rem] gap-3">
      <FormField :label="$t('projectEditor.name')"
        ><FormInput
          v-model="name"
          :placeholder="$t('projectEditor.namePlaceholder')"
          @keyup.enter="submit" /></FormField
      ><FormField :label="$t('projectEditor.color')"
        ><FormInput
          v-model="color"
          type="color"
          class="cursor-pointer p-1"
      /></FormField>
    </div>
    <template #footer
      ><AppButton
        variant="ghost"
        @click="emit('close')"
        >{{ $t('common.close') }}</AppButton
      ><AppButton
        variant="primary"
        @click="submit"
        >{{ $t('common.add') }}</AppButton
      ></template
    >
  </Modal>
</template>
