<script setup lang="ts">
interface ReminderItem {
  id: string
  taskId: string
  title: string
  scheduledAt: number
  deliveredAt: number
  readAt: number | null
}

const { t } = useI18n()
const items = ref<ReminderItem[]>([])
const loading = ref(false)
const known = new Set<string>()
const unread = computed(() => items.value.filter((item) => !item.readAt).length)

async function load() {
  loading.value = true
  try {
    const next = await $fetch<ReminderItem[]>('/api/reminders')
    if (import.meta.client && Notification.permission === 'granted') {
      next
        .filter((item) => !item.readAt && !known.has(item.id))
        .forEach((item) => new Notification(t('reminders.notificationTitle'), { body: item.title }))
    }
    next.forEach((item) => known.add(item.id))
    items.value = next
  } catch {
    // The shell remains usable while notifications are temporarily unavailable.
  } finally {
    loading.value = false
  }
}

async function update(item: ReminderItem, action: 'read' | 'dismiss') {
  await $fetch(`/api/reminders/${item.id}`, { method: 'PATCH', body: { action } })
  if (action === 'dismiss') items.value = items.value.filter((entry) => entry.id !== item.id)
  else item.readAt = Date.now()
}

async function open(item: ReminderItem) {
  await update(item, 'read')
  await navigateTo({ path: '/', query: { task: item.taskId } })
}

onMounted(load)
useIntervalFn(load, 60_000)
</script>

<template>
  <UPopover class="shell-reminders">
    <button
      class="shell-reminders__trigger text-secondary relative rounded-lg p-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
      :title="$t('reminders.title')"
      :aria-label="$t('reminders.title')"
    >
      <UIcon
        name="i-lucide-bell"
        class="size-5"
      />
      <span
        v-if="unread"
        class="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white"
        >{{ unread > 9 ? '9+' : unread }}</span
      >
    </button>
    <template #content>
      <section class="shell-reminders__panel w-[min(22rem,calc(100vw-1.5rem))] p-2">
        <header class="flex items-center justify-between px-2 py-1.5">
          <strong class="text-sm">{{ $t('reminders.title') }}</strong>
          <UIcon
            v-if="loading"
            name="i-lucide-loader-circle"
            class="size-4 animate-spin"
          />
        </header>
        <p
          v-if="!items.length"
          class="text-secondary px-2 py-6 text-center text-xs"
        >
          {{ $t('reminders.empty') }}
        </p>
        <article
          v-for="item in items"
          :key="item.id"
          class="shell-reminders__item flex items-start gap-2 rounded-lg p-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          :class="{ 'shell-reminders__item--unread': !item.readAt }"
        >
          <button
            class="min-w-0 flex-1 text-left"
            @click="open(item)"
          >
            <span class="block truncate text-sm font-semibold">{{ item.title }}</span>
            <time class="text-secondary text-xs">{{ new Date(item.scheduledAt).toLocaleString() }}</time>
          </button>
          <IconButton
            icon="i-lucide-x"
            :label="$t('reminders.dismiss')"
            size="sm"
            @click="update(item, 'dismiss')"
          />
        </article>
      </section>
    </template>
  </UPopover>
</template>
