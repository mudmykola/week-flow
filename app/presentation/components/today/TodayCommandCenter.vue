<script setup lang="ts">
import { captureInboxItems, fetchInboxItems } from '~/data/repositories/inboxRepository'
import { fetchStickyNotes, updateStickyNote } from '~/data/repositories/stickyNotesRepository'
import type { InboxItem } from '~/domain/entities/inbox'
import type { StickyNote } from '~/domain/entities/stickyNote'

interface ReminderItem {
  id: string
  taskId: string
  title: string
  scheduledAt: number
}

const inbox = ref<InboxItem[]>([])
const notes = ref<StickyNote[]>([])
const reminders = ref<ReminderItem[]>([])
const capture = ref('')
const saving = ref(false)
const offlineQueue = useOfflineMutationQueue()

const checklist = computed(() =>
  notes.value
    .filter((note) => !note.done)
    .flatMap((note) =>
      note.content
        .split('\n')
        .map((label, index) => ({ note, index, label: label.trim(), checked: note.checkedItems.includes(index) }))
        .filter((item) => item.label && !item.checked)
    )
    .slice(0, 5)
)

async function load() {
  const [inboxItems, stickyItems, reminderItems] = await Promise.all([
    fetchInboxItems(),
    fetchStickyNotes(),
    $fetch<ReminderItem[]>('/api/reminders')
  ])
  inbox.value = inboxItems
  notes.value = stickyItems
  reminders.value = reminderItems.slice(0, 5)
}

async function submit() {
  if (!capture.value.trim() || saving.value) return
  saving.value = true
  try {
    inbox.value.unshift(...(await captureInboxItems(capture.value)))
    capture.value = ''
  } finally {
    saving.value = false
  }
}

async function check(item: (typeof checklist.value)[number]) {
  const checkedItems = [...new Set([...item.note.checkedItems, item.index])]
  const updated = await offlineQueue.capture(
    { url: `/api/sticky-notes/${item.note.id}`, method: 'PATCH', body: { checkedItems } },
    () => updateStickyNote(item.note.id, { checkedItems }),
    { ...item.note, checkedItems, updatedAt: Date.now() }
  )
  const index = notes.value.findIndex((note) => note.id === updated.id)
  if (index !== -1) notes.value[index] = updated
}

onMounted(() => load().catch(() => {}))
</script>

<template>
  <section class="today-command-center surface-card">
    <header class="today-command-center__header">
      <div>
        <p class="today-command-center__eyebrow">{{ $t('pages.today.commandCenter.eyebrow') }}</p>
        <h2>{{ $t('pages.today.commandCenter.title') }}</h2>
      </div>
      <AppButton
        to="/inbox"
        size="sm"
        variant="ghost"
        icon="i-lucide-inbox"
        >{{ inbox.length }}</AppButton
      >
    </header>
    <form
      class="today-command-center__capture"
      @submit.prevent="submit"
    >
      <FormInput
        v-model="capture"
        :placeholder="$t('pages.today.commandCenter.capture')"
      />
      <IconButton
        type="submit"
        icon="i-lucide-arrow-up"
        :label="$t('pages.today.commandCenter.saveCapture')"
        :loading="saving"
      />
    </form>
    <div class="today-command-center__grid">
      <article>
        <h3><UIcon name="i-lucide-inbox" />{{ $t('nav.inbox') }}</h3>
        <NuxtLink
          v-for="item in inbox.slice(0, 3)"
          :key="item.id"
          to="/inbox"
          class="today-command-center__row"
          >{{ item.content }}</NuxtLink
        >
        <p v-if="!inbox.length">{{ $t('pages.today.commandCenter.inboxEmpty') }}</p>
      </article>
      <article>
        <h3><UIcon name="i-lucide-sticky-note" />{{ $t('nav.notes') }}</h3>
        <button
          v-for="item in checklist"
          :key="`${item.note.id}-${item.index}`"
          class="today-command-center__row"
          @click="check(item)"
        >
          <UIcon name="i-lucide-circle" />{{ item.label }}
        </button>
        <p v-if="!checklist.length">{{ $t('pages.today.commandCenter.notesEmpty') }}</p>
      </article>
      <article>
        <h3><UIcon name="i-lucide-bell" />{{ $t('reminders.title') }}</h3>
        <NuxtLink
          v-for="item in reminders"
          :key="item.id"
          :to="{ path: '/', query: { task: item.taskId } }"
          class="today-command-center__row"
          >{{ item.title }}</NuxtLink
        >
        <p v-if="!reminders.length">{{ $t('reminders.empty') }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/today/today-command-center.css"></style>
