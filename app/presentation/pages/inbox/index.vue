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
  <main class="inbox-page inbox-workspace app-container">
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

    <section class="inbox-workspace__capture">
      <div class="inbox-workspace__capture-icon"><UIcon name="i-lucide-sparkles" /></div>
      <textarea
        v-model="capture"
        rows="3"
        :placeholder="$t('pages.inbox.capturePlaceholder')"
        @keydown="captureKeydown"
      />
      <div class="inbox-workspace__capture-footer">
        <span>{{ $t('pages.inbox.captureHint') }}</span
        ><AppButton
          :loading="saving"
          icon="i-lucide-arrow-down-to-line"
          @click="submitCapture"
          >{{ $t('pages.inbox.capture') }}</AppButton
        >
      </div>
    </section>

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
    <section
      v-else
      class="inbox-workspace__list"
    >
      <article
        v-for="item in items"
        :key="item.id"
        class="inbox-item"
        :class="{ 'inbox-item--stale': ageDays(item) >= 3 }"
      >
        <input
          type="checkbox"
          :checked="selected.includes(item.id)"
          :aria-label="$t('pages.inbox.selectItem')"
          @change="toggleSelected(item.id, ($event.target as HTMLInputElement).checked)"
        />
        <div class="inbox-item__content">
          <input
            v-if="editingId === item.id"
            v-model="editingContent"
            class="inbox-item__edit"
            autofocus
            @keydown.enter.prevent="saveEdit(item)"
            @blur="saveEdit(item)"
          />
          <button
            v-else
            type="button"
            @click="startEdit(item)"
          >
            {{ item.content }}
          </button>
          <span>{{ $t('pages.inbox.age', { days: ageDays(item) }) }}</span>
        </div>
        <div class="inbox-item__actions">
          <IconButton
            icon="i-lucide-sun"
            :label="$t('pages.inbox.toToday')"
            @click="resolve(item, 'today')"
          />
          <IconButton
            icon="i-lucide-square-check-big"
            :label="$t('pages.inbox.toTask')"
            @click="resolve(item, 'task')"
          />
          <IconButton
            icon="i-lucide-sticky-note"
            :label="$t('pages.inbox.toSticky')"
            @click="resolve(item, 'sticky')"
          />
          <IconButton
            icon="i-lucide-folder-plus"
            :label="$t('pages.inbox.toProject')"
            @click="resolve(item, 'project')"
          />
          <IconButton
            icon="i-lucide-target"
            :label="$t('pages.inbox.toGoal')"
            @click="resolve(item, 'goal')"
          />
          <IconButton
            icon="i-lucide-trash-2"
            :label="$t('common.delete')"
            @click="dismiss(item)"
          />
        </div>
      </article>
    </section>

    <Teleport to="body"
      ><div
        v-if="processing"
        class="inbox-process"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <span>{{ $t('pages.inbox.processMode') }}</span
            ><strong>{{ processIndex + 1 }} / {{ items.length }}</strong>
          </div>
          <IconButton
            icon="i-lucide-x"
            :label="$t('common.close')"
            @click="processing = false"
          />
        </header>
        <main v-if="current">
          <p>{{ current.content }}</p>
          <div class="inbox-process__fields">
            <FormSelect
              v-model="projectId"
              :aria-label="$t('task.project')"
              ><option :value="null">{{ $t('task.noProject') }}</option>
              <option
                v-for="project in projects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </option></FormSelect
            ><FormSelect
              v-model="assigneeId"
              :aria-label="$t('task.assignee')"
              ><option :value="null">{{ $t('task.unassigned') }}</option>
              <option
                v-for="person in assignees"
                :key="person.id"
                :value="person.id"
              >
                {{ person.name }}
              </option></FormSelect
            ><FormInput
              v-model="plannedDate"
              type="date"
              :aria-label="$t('task.plannedDate')"
            /><button @click="tomorrow">{{ $t('pages.inbox.tomorrow') }}</button>
          </div>
          <div class="inbox-process__choices">
            <button @click="resolve(current, 'today')">
              <kbd>1</kbd><UIcon name="i-lucide-sun" />{{ $t('pages.inbox.toToday') }}</button
            ><button @click="resolve(current, 'task')">
              <kbd>2</kbd><UIcon name="i-lucide-square-check-big" />{{ $t('pages.inbox.toTask') }}</button
            ><button @click="resolve(current, 'sticky')">
              <kbd>3</kbd><UIcon name="i-lucide-sticky-note" />{{ $t('pages.inbox.toSticky') }}</button
            ><button @click="resolve(current, 'project')">
              <kbd>4</kbd><UIcon name="i-lucide-folder-plus" />{{ $t('pages.inbox.toProject') }}
            </button>
            <button @click="resolve(current, 'goal')">
              <kbd>5</kbd><UIcon name="i-lucide-target" />{{ $t('pages.inbox.toGoal') }}
            </button>
          </div>
        </main>
        <EmptyState
          v-else
          :title="$t('pages.inbox.empty')"
          :description="$t('pages.inbox.emptyHint')"
          icon="i-lucide-party-popper"
        /></div
    ></Teleport>
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

<style scoped>
.inbox-workspace {
  max-width: 72rem;
  padding-bottom: 5rem;
}
.inbox-workspace__capture {
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 42%, var(--color-panel-border));
  border-radius: 1rem;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-accent) 7%, var(--color-panel-bg)),
    var(--color-panel-bg)
  );
  box-shadow: 0 14px 40px rgb(0 0 0/0.08);
}
.inbox-workspace__capture-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  margin-bottom: 0.5rem;
  border-radius: 0.6rem;
  background: var(--color-accent);
  color: white;
}
.inbox-workspace__capture textarea {
  width: 100%;
  resize: vertical;
  background: transparent;
  font-size: 1.05rem;
  outline: none;
}
.inbox-workspace__capture-footer,
.inbox-workspace__bulk {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.inbox-workspace__capture-footer {
  justify-content: space-between;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
}
.inbox-workspace__stats {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.6rem;
  margin: 0.75rem 0;
}
.inbox-workspace__stats > div {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0.15rem 0.45rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
}
.inbox-workspace__stats span {
  grid-column: 2;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.inbox-workspace__stats p {
  align-self: center;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-align: right;
}
.inbox-workspace__bulk {
  position: sticky;
  top: 0.5rem;
  z-index: 10;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-accent);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
}
.inbox-workspace__bulk strong {
  margin-right: auto;
}
.inbox-workspace__loading,
.inbox-workspace__list {
  display: grid;
  gap: 0.5rem;
}
.inbox-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.85rem;
  background: var(--color-panel-bg);
}
.inbox-item--stale {
  border-left: 3px solid #f59e0b;
}
.inbox-item__content {
  min-width: 0;
}
.inbox-item__content button,
.inbox-item__edit {
  width: 100%;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 600;
}
.inbox-item__edit {
  padding: 0.3rem;
  border-bottom: 1px solid var(--color-accent);
  background: transparent;
  outline: none;
}
.inbox-item__content span {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.inbox-item__actions {
  display: flex;
  gap: 0.15rem;
}
.inbox-workspace__undo {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 70;
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: #09090b;
  color: white;
}
.inbox-workspace__undo button {
  color: var(--color-accent);
}
.inbox-workspace__error {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  z-index: 70;
  transform: translateX(-50%);
  padding: 0.65rem 1rem;
  border-radius: 0.7rem;
  background: var(--color-danger);
  color: white;
}
.inbox-process {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: clamp(1rem, 4vw, 3rem);
  background: var(--color-bg);
  color: var(--color-text-primary);
}
.inbox-process > header {
  display: flex;
  justify-content: space-between;
}
.inbox-process > header div {
  display: grid;
}
.inbox-process > main {
  display: grid;
  place-content: center;
  flex: 1;
  width: min(50rem, 100%);
  margin: auto;
}
.inbox-process > main > p {
  margin-bottom: 2rem;
  font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 750;
  text-align: center;
}
.inbox-process__fields,
.inbox-process__choices {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.6rem;
}
.inbox-process__fields {
  margin-bottom: 1rem;
}
.inbox-process__fields button {
  font-size: 0.75rem;
  color: var(--color-accent);
}
.inbox-process__choices button {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 7rem;
  padding: 1rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 1rem;
  background: var(--color-panel-bg);
  font-weight: 700;
}
.inbox-process__choices button:hover {
  border-color: var(--color-accent);
}
.inbox-process__choices kbd {
  justify-self: end;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.inbox-process__choices svg {
  font-size: 1.4rem;
  color: var(--color-accent);
}
@media (max-width: 700px) {
  .inbox-workspace__stats {
    grid-template-columns: 1fr 1fr;
  }
  .inbox-workspace__stats p {
    grid-column: 1/-1;
    text-align: left;
  }
  .inbox-item {
    grid-template-columns: auto 1fr;
  }
  .inbox-item__actions {
    grid-column: 1/-1;
    justify-content: flex-end;
  }
  .inbox-process__fields,
  .inbox-process__choices {
    grid-template-columns: 1fr 1fr;
  }
  .inbox-process {
    padding: 1rem;
  }
  .inbox-process > main > p {
    margin-bottom: 1rem;
  }
  .inbox-workspace__capture-footer span {
    display: none;
  }
}
</style>
