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
  const result = await $fetch<{ url: string }>(`/api/projects/${inviteProjectId.value}/invitations`, { method: 'POST', body: { email: inviteEmail.value.trim(), role: 'editor' } })
  inviteUrl.value = `${window.location.origin}${result.url}`
  await navigator.clipboard.writeText(inviteUrl.value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="emit('close')"
    >
      <div class="glass-panel w-full max-w-lg p-8">
        <h2 class="font-display mb-6 text-2xl">Проєкти</h2>

        <div v-if="projects.length" class="mb-6 flex flex-col gap-2">
          <div
            v-for="project in projects"
            :key="project.id"
            class="flex items-center justify-between rounded-lg px-3 py-2.5"
            style="background-color: rgba(0, 0, 0, 0.03)"
          >
            <span class="flex items-center gap-2.5 text-base">
              <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: project.color }" />
              {{ project.name }}
            </span>
            <button
              type="button"
              class="text-lg text-secondary hover:text-black"
              title="Видалити проєкт"
              @click="emit('delete', project.id)"
            >
              ✕
            </button>
          </div>
        </div>
        <p v-else class="mb-6 text-sm text-secondary">Ще немає жодного проєкту</p>

        <div v-if="projects.length" class="mb-6 rounded-xl border border-black/10 p-4">
          <h3 class="mb-3 flex items-center gap-2 font-medium"><UIcon name="i-lucide-user-plus" /> Запросити учасника</h3>
          <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select v-model="inviteProjectId" class="rounded-lg border border-black/10 bg-transparent px-3 py-2"><option :value="null">Оберіть проєкт</option><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option></select><input v-model="inviteEmail" type="email" placeholder="email@gmail.com" class="rounded-lg border border-black/10 bg-transparent px-3 py-2"><button class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white" @click="invite">Копіювати invite</button></div>
          <p v-if="inviteUrl" class="mt-2 truncate text-xs text-secondary">{{ inviteUrl }}</p>
        </div>

        <div class="flex gap-4">
          <div class="flex-1">
            <label class="mb-1.5 block text-sm text-secondary">Назва</label>
            <input
              v-model="name"
              type="text"
              class="w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-base outline-none focus:border-[var(--color-accent)]"
              placeholder="Назва проєкту"
              @keyup.enter="submit"
            >
          </div>

          <div>
            <label class="mb-1.5 block text-sm text-secondary">Колір</label>
            <input
              v-model="color"
              type="color"
              class="h-[46px] w-16 cursor-pointer rounded-lg border border-black/10 bg-black/[0.02] p-1"
            >
          </div>
        </div>

        <div class="mt-7 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg px-4 py-2.5 text-base text-secondary hover:text-black"
            @click="emit('close')"
          >
            Закрити
          </button>
          <button
            type="button"
            class="rounded-full px-5 py-2.5 text-base font-medium"
            style="background-color: var(--color-accent); color: #ffffff"
            @click="submit"
          >
            Додати
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
