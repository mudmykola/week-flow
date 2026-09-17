<script setup lang="ts">
import type { ReviewProgressEntry, ReviewProgressKind, ReviewTaskJournal } from '~/domain/entities/review'

const props = defineProps<{
  journal: ReviewTaskJournal
  subtasks: Array<{
    id: string
    title: string
    status: string
    plannedDate: string | null
    rescheduleCount: number
  }>
  canEdit: boolean
  saving?: boolean
}>()
const { t } = useI18n()
const emit = defineEmits<{
  create: [
    input: {
      taskId: string
      subtaskId: string | null
      kind: ReviewProgressKind
      note: string
      minutes: number | null
      nextStep: string | null
    }
  ]
  update: [
    id: string,
    patch: { kind: ReviewProgressKind; note: string; minutes: number | null; nextStep: string | null }
  ]
  delete: [id: string]
  open: []
}>()
const open = ref(true)
const showHistory = ref(false)
const editingId = ref<string | null>(null)
const edit = reactive({
  kind: 'progress' as ReviewProgressKind,
  note: '',
  minutes: null as number | null,
  nextStep: ''
})
const completedCount = computed(() => props.subtasks.filter((item) => item.status === 'done').length)
const olderEntries = computed(() =>
  props.journal.historyEntries.filter((entry) => entry.workDate !== props.journal.entries[0]?.workDate)
)

function startEdit(entry: ReviewProgressEntry) {
  editingId.value = entry.id
  Object.assign(edit, { kind: entry.kind, note: entry.note, minutes: entry.minutes, nextStep: entry.nextStep || '' })
}
function saveEdit() {
  if (!editingId.value || edit.note.trim().length < 2) return
  emit('update', editingId.value, {
    kind: edit.kind,
    note: edit.note.trim(),
    minutes: edit.minutes || null,
    nextStep: edit.nextStep.trim() || null
  })
  editingId.value = null
}
function time(value: number) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(value)
}
function day(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
}
function eventText(event: ReviewTaskJournal['activity'][number]) {
  const title = String(event.metadata.subtaskTitle || '')
  const previous = String(event.metadata.previousPlannedDate || t('pages.review.progress.noDate'))
  const next = String(event.metadata.plannedDate || t('pages.review.progress.noDate'))
  if (event.action === 'task.updated' && 'plannedDate' in event.metadata)
    return t('pages.review.progress.event.taskRescheduled', { previous, next })
  if (event.action === 'subtask.updated' && 'plannedDate' in event.metadata)
    return t('pages.review.progress.event.subtaskRescheduled', { title, previous, next })
  if (event.action === 'subtask.completed') return t('pages.review.progress.event.subtaskCompleted', { title })
  if (event.action === 'subtask.updated') return t('pages.review.progress.event.subtaskUpdated', { title })
  return t('pages.review.progress.event.taskUpdated')
}
</script>

<template>
  <article class="review-task-journal-card surface-card">
    <header class="review-task-journal-card__header">
      <button
        class="review-task-journal-card__toggle"
        @click="open = !open"
      >
        <UIcon :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" /><span
          ><strong>{{ journal.task.title }}</strong
          ><small>{{ journal.task.projectName || $t('task.noProject') }}</small></span
        >
      </button>
      <div class="review-task-journal-card__meta">
        <SemanticBadge
          v-if="journal.activeDays"
          tone="info"
          icon="i-lucide-calendar-days"
          >{{ $t('pages.review.progress.activeDays', { count: journal.activeDays }) }}</SemanticBadge
        >
        <SemanticBadge
          v-if="subtasks.length"
          tone="neutral"
          icon="i-lucide-list-checks"
          >{{ completedCount }}/{{ subtasks.length }}</SemanticBadge
        >
        <SemanticBadge
          v-if="journal.focusMinutes"
          tone="info"
          icon="i-lucide-timer"
          >{{ journal.focusMinutes }} {{ $t('pages.review.progress.minShort') }}</SemanticBadge
        >
        <IconButton
          icon="i-lucide-arrow-up-right"
          :label="$t('pages.review.progress.openTask')"
          size="sm"
          variant="ghost"
          @click="emit('open')"
        />
      </div>
    </header>

    <div
      v-if="open"
      class="review-task-journal-card__body"
    >
      <div
        v-if="journal.entries.length || journal.completedSubtasks.length || journal.activity.length"
        class="review-task-journal-card__timeline"
      >
        <div
          v-for="entry in journal.entries"
          :key="entry.id"
          class="review-task-journal-card__entry"
          :class="`is-${entry.kind}`"
        >
          <i />
          <template v-if="editingId === entry.id">
            <div class="review-task-journal-card__edit">
              <FormSelect v-model="edit.kind"
                ><option
                  v-for="value in ['progress', 'result', 'decision', 'blocker']"
                  :key="value"
                  :value="value"
                >
                  {{ $t(`pages.review.progress.kindValue.${value}`) }}
                </option></FormSelect
              >
              <FormTextarea
                v-model="edit.note"
                :rows="2"
              />
              <div>
                <FormInput
                  v-model="edit.minutes"
                  type="number"
                  min="1"
                  :placeholder="$t('pages.review.progress.minutes')"
                /><FormInput
                  v-model="edit.nextStep"
                  :placeholder="$t('pages.review.progress.nextStep')"
                />
              </div>
              <footer>
                <AppButton
                  size="sm"
                  variant="ghost"
                  @click="editingId = null"
                  >{{ $t('common.cancel') }}</AppButton
                ><AppButton
                  size="sm"
                  icon="i-lucide-save"
                  @click="saveEdit"
                  >{{ $t('common.save') }}</AppButton
                >
              </footer>
            </div>
          </template>
          <template v-else>
            <div>
              <div class="review-task-journal-card__entry-meta">
                <SemanticBadge
                  :tone="entry.kind === 'blocker' ? 'danger' : entry.kind === 'result' ? 'success' : 'info'"
                  size="sm"
                  >{{ $t(`pages.review.progress.kindValue.${entry.kind}`) }}</SemanticBadge
                ><span v-if="entry.subtaskTitle">{{ entry.subtaskTitle }}</span
                ><span v-if="entry.minutes">{{ entry.minutes }} {{ $t('pages.review.progress.minShort') }}</span
                ><time>{{ time(entry.createdAt) }}</time>
              </div>
              <p>{{ entry.note }}</p>
              <small v-if="entry.nextStep"
                ><UIcon name="i-lucide-arrow-right" />{{ $t('pages.review.progress.next') }}:
                {{ entry.nextStep }}</small
              >
            </div>
            <div
              v-if="canEdit"
              class="review-task-journal-card__actions"
            >
              <IconButton
                icon="i-lucide-pencil"
                :label="$t('common.edit')"
                size="sm"
                variant="ghost"
                @click="startEdit(entry)"
              /><IconButton
                icon="i-lucide-trash-2"
                :label="$t('common.delete')"
                size="sm"
                variant="ghost"
                @click="emit('delete', entry.id)"
              />
            </div>
          </template>
        </div>
        <div
          v-for="subtask in journal.completedSubtasks"
          :key="`done-${subtask.id}`"
          class="review-task-journal-card__system"
        >
          <UIcon name="i-lucide-circle-check" /><span>{{
            $t('pages.review.progress.subtaskCompleted', { title: subtask.title })
          }}</span
          ><time>{{ time(subtask.doneAt) }}</time>
        </div>
        <div
          v-for="event in journal.activity.filter(
            (item) =>
              item.action.startsWith('subtask.') || (item.action === 'task.updated' && 'plannedDate' in item.metadata)
          )"
          :key="event.id"
          class="review-task-journal-card__system"
        >
          <UIcon name="i-lucide-git-commit-horizontal" /><span>{{ eventText(event) }}</span
          ><time>{{ time(event.createdAt) }}</time>
        </div>
      </div>
      <p
        v-else
        class="review-task-journal-card__empty"
      >
        {{ $t('pages.review.progress.noActivityToday') }}
      </p>

      <button
        v-if="olderEntries.length"
        class="review-task-journal-card__history-toggle"
        @click="showHistory = !showHistory"
      >
        <UIcon name="i-lucide-history" />{{
          showHistory
            ? $t('pages.review.progress.hideHistory')
            : $t('pages.review.progress.showHistory', { count: olderEntries.length })
        }}<UIcon :name="showHistory ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
      </button>
      <div
        v-if="showHistory"
        class="review-task-journal-card__history"
      >
        <div
          v-for="entry in olderEntries"
          :key="`history-${entry.id}`"
        >
          <time>{{ day(entry.workDate) }}</time
          ><span
            ><strong>{{ entry.note }}</strong
            ><small v-if="entry.nextStep">{{ $t('pages.review.progress.next') }}: {{ entry.nextStep }}</small></span
          ><SemanticBadge
            :tone="entry.kind === 'blocker' ? 'danger' : entry.kind === 'result' ? 'success' : 'info'"
            size="sm"
            >{{ $t(`pages.review.progress.kindValue.${entry.kind}`) }}</SemanticBadge
          >
        </div>
      </div>
      <ReviewEntryComposer
        v-if="canEdit"
        :task-id="journal.task.id"
        :subtasks="subtasks"
        :saving="saving"
        @create="emit('create', $event)"
      />
    </div>
  </article>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-task-journal-card.css"></style>
