<script setup lang="ts">
import { addDays, format } from 'date-fns'
import {
  captureInboxItems,
  deleteInboxItem,
  fetchInboxItems,
  resolveInboxItem,
  updateInboxItem
} from '~/data/repositories/inboxRepository'
import { fetchProjects } from '~/data/repositories/projectsRepository'
import type { InboxDestination, InboxItem } from '~/domain/entities/inbox'
import type { Project } from '~/domain/entities/project'
import type { AssignableUser } from '~/domain/entities/task'
import { localDateKey } from '~/domain/services/today'

const { t } = useI18n()
const route = useRoute()
const items = useState<InboxItem[]>('inbox-items', () => [])
const projects = ref<Project[]>([])
const assignees = ref<AssignableUser[]>([])
const capture = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const processing = ref(false)
const processIndex = ref(0)
const selected = ref<string[]>([])
const editingId = ref<string | null>(null)
const editingContent = ref('')
const projectId = ref<string | null>(null)
const assigneeId = ref<string | null>(null)
const plannedDate = ref(localDateKey())
const undo = ref<null | { content: string; label: string }>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined

const current = computed(() => items.value[processIndex.value] ?? null)
const staleCount = computed(() => items.value.filter((item) => ageDays(item) >= 3).length)
const sharedText = computed(() => {
  const value = route.query.text ?? route.query.title
  return typeof value === 'string' ? value : ''
})

onMounted(async () => {
  capture.value = sharedText.value
  try {
    const [captured, projectItems, people] = await Promise.all([
      fetchInboxItems(),
      fetchProjects(),
      $fetch<AssignableUser[]>('/api/users/assignable').catch(() => [])
    ])
    items.value = captured
    projects.value = projectItems
    assignees.value = people
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('pages.inbox.loadError')
  } finally {
    loading.value = false
  }
})

function ageDays(item: InboxItem) {
  return Math.floor((Date.now() - item.createdAt) / 86_400_000)
}
async function submitCapture() {
  if (!capture.value.trim() || saving.value) return
  saving.value = true
  try {
    items.value.unshift(...(await captureInboxItems(capture.value)))
    capture.value = ''
  } finally {
    saving.value = false
  }
}
function captureKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    void submitCapture()
  }
}
function startEdit(item: InboxItem) {
  editingId.value = item.id
  editingContent.value = item.content
}
async function saveEdit(item: InboxItem) {
  if (!editingContent.value.trim()) return
  const saved = await updateInboxItem(item.id, editingContent.value)
  const index = items.value.findIndex((entry) => entry.id === item.id)
  if (index !== -1) items.value[index] = saved
  editingId.value = null
}
function offerUndo(item: InboxItem, label: string) {
  undo.value = { content: item.content, label }
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => {
    undo.value = null
  }, 8000)
}
async function dismiss(item: InboxItem) {
  items.value = items.value.filter((entry) => entry.id !== item.id)
  await deleteInboxItem(item.id)
  offerUndo(item, t('pages.inbox.deletedUndo'))
}
async function restore() {
  if (!undo.value) return
  const action = undo.value
  undo.value = null
  items.value.unshift(...(await captureInboxItems(action.content)))
}
async function resolve(item: InboxItem, destination: InboxDestination) {
  if (saving.value) return
  saving.value = true
  const snapshot = [...items.value]
  items.value = items.value.filter((entry) => entry.id !== item.id)
  try {
    await resolveInboxItem(item.id, {
      destination,
      projectId: destination === 'task' || destination === 'today' ? projectId.value : null,
      assigneeId: destination === 'task' || destination === 'today' ? assigneeId.value : null,
      plannedDate: destination === 'today' ? plannedDate.value : null
    })
    if (destination === 'project') broadcastSync('projects')
    else if (destination === 'goal') broadcastSync('goals')
    else if (destination === 'task' || destination === 'today') broadcastSync('tasks')
    if (processIndex.value >= items.value.length) processIndex.value = Math.max(0, items.value.length - 1)
  } catch (cause) {
    items.value = snapshot
    error.value = cause instanceof Error ? cause.message : t('pages.inbox.processError')
  } finally {
    saving.value = false
  }
}
function toggleSelected(id: string, value: boolean) {
  selected.value = value ? [...new Set([...selected.value, id])] : selected.value.filter((entry) => entry !== id)
}
async function bulk(destination: 'task' | 'today') {
  const targets = items.value.filter((item) => selected.value.includes(item.id))
  for (const item of targets) await resolve(item, destination)
  selected.value = []
}
function tomorrow() {
  plannedDate.value = format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

useEventListener('keydown', (event) => {
  if (!processing.value || !current.value || (event.target as HTMLElement)?.matches('input,textarea,select')) return
  if (event.key === '1') void resolve(current.value, 'today')
  if (event.key === '2') void resolve(current.value, 'task')
  if (event.key === '3') void resolve(current.value, 'sticky')
  if (event.key === '4') void resolve(current.value, 'project')
  if (event.key === '5') void resolve(current.value, 'goal')
  if (event.key === 'Backspace') void dismiss(current.value)
  if (event.key === 'Escape') processing.value = false
})
</script>

<template>
  <main class="inbox-workspace inbox-page app-container">
    <PageHeader
      title="Inbox"
      :description="$t('pages.inbox.description')"
      icon="i-lucide-inbox"
      :count="items.length"
    >
      <AppButton
        v-if="items.length"
        icon="i-lucide-layers-3"
        @click="processing = true"
        >{{ $t('pages.inbox.processMode') }}</AppButton
      >
    </PageHeader>

    <InboxCapture
      v-model="capture"
      :saving="saving"
      @submit="submitCapture"
      @keydown="captureKeydown"
    />

    <section class="inbox-workspace__stats">
      <div>
        <UIcon name="i-lucide-inbox" /><strong>{{ items.length }}</strong
        ><span>{{ $t('pages.inbox.unprocessed') }}</span>
      </div>
      <div>
        <UIcon name="i-lucide-clock-alert" /><strong>{{ staleCount }}</strong
        ><span>{{ $t('pages.inbox.stale') }}</span>
      </div>
      <p>{{ $t('pages.inbox.workflowHint') }}</p>
    </section>

    <div
      v-if="selected.length"
      class="inbox-workspace__bulk"
    >
      <strong>{{ $t('pages.inbox.selected', { count: selected.length }) }}</strong
      ><AppButton
        size="sm"
        @click="bulk('today')"
        >{{ $t('pages.inbox.toToday') }}</AppButton
      ><AppButton
        size="sm"
        variant="secondary"
        @click="bulk('task')"
        >{{ $t('pages.inbox.toTask') }}</AppButton
      ><IconButton
        icon="i-lucide-x"
        :label="$t('common.close')"
        @click="selected = []"
      />
    </div>

    <div
      v-if="loading"
      class="inbox-workspace__loading"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-20 rounded-xl"
      />
    </div>
    <EmptyState
      v-else-if="!items.length"
      :title="$t('pages.inbox.empty')"
      :description="$t('pages.inbox.emptyHint')"
      icon="i-lucide-inbox-check"
    />
    <InboxQueue
      v-else
      v-model:editing-content="editingContent"
      :items="items"
      :selected="selected"
      :editing-id="editingId"
      @select="toggleSelected"
      @start-edit="startEdit"
      @save-edit="saveEdit"
      @resolve="resolve"
      @dismiss="dismiss"
    />

    <InboxProcessor
      v-model:project-id="projectId"
      v-model:assignee-id="assigneeId"
      v-model:planned-date="plannedDate"
      :open="processing"
      :current="current"
      :index="processIndex"
      :total="items.length"
      :projects="projects"
      :assignees="assignees"
      @close="processing = false"
      @resolve="resolve"
      @tomorrow="tomorrow"
    />
    <div
      v-if="undo"
      class="inbox-workspace__undo"
    >
      <span>{{ undo.label }}</span
      ><button @click="restore">{{ $t('common.cancel') }}</button>
    </div>
    <p
      v-if="error"
      class="inbox-workspace__error"
    >
      {{ error }}
    </p>
  </main>
</template>

<style src="~/presentation/assets/css/pages/inbox.css"></style>
