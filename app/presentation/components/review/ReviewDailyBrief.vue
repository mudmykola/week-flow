<script setup lang="ts">
import type { DailyReviewData, ReviewTask } from '~/domain/entities/review'

type BriefTone = 'success' | 'info' | 'accent' | 'warning'
type BriefItem = {
  task: ReviewTask
  detail: string
  meta: string
}
type BriefSection = {
  id: 'completed' | 'worked' | 'next' | 'attention'
  title: string
  empty: string
  icon: string
  tone: BriefTone
  items: BriefItem[]
}

const props = defineProps<{ data: DailyReviewData }>()
const emit = defineEmits<{ open: [task: ReviewTask] }>()
const { t } = useI18n()
const expanded = ref(new Set<string>())
const previewLimit = 4

const sections = computed<BriefSection[]>(() => {
  const completedIds = new Set(props.data.completed.map((task) => task.id))
  const journals = new Map(props.data.journals.map((journal) => [journal.task.id, journal]))
  const completed = unique(props.data.completed).map((task) => {
    const subtaskCount = props.data.completedSubtasks.filter((item) => item.taskId === task.id).length
    return item(
      task,
      subtaskCount ? t('pages.review.brief.subtasksDone', { count: subtaskCount }) : '',
      task.projectName
    )
  })
  const worked = unique([...props.data.journals.map((journal) => journal.task), ...props.data.workedOn])
    .filter((task) => !completedIds.has(task.id))
    .map((task) => {
      const journal = journals.get(task.id)
      const latest = journal?.entries.at(0)
      const detail = latest?.note || t('pages.review.brief.activityRecorded')
      const meta = [
        journal?.focusMinutes ? t('pages.review.brief.minutes', { count: journal.focusMinutes }) : '',
        latest?.nextStep
      ]
        .filter(Boolean)
        .join(' · ')
      return item(task, detail, meta)
    })
  const next = unique(props.data.planned)
    .filter((task) => !completedIds.has(task.id))
    .map((task) => item(task, task.plannedTime || task.dueDate || '', task.projectName))
  const blockerIds = new Set(props.data.blockers.map((task) => task.id))
  const attention = unique([...props.data.blockers, ...props.data.carriedOver])
    .filter((task) => !completedIds.has(task.id))
    .map((task) =>
      item(
        task,
        blockerIds.has(task.id) ? t('pages.review.brief.blocked') : t('pages.review.brief.carried'),
        task.carryoverReason || task.projectName
      )
    )

  return [
    section('completed', 'i-lucide-circle-check-big', 'success', completed),
    section('worked', 'i-lucide-activity', 'info', worked),
    section('next', 'i-lucide-route', 'accent', next),
    section('attention', 'i-lucide-triangle-alert', 'warning', attention)
  ]
})

function section(id: BriefSection['id'], icon: string, tone: BriefTone, items: BriefItem[]): BriefSection {
  return {
    id,
    icon,
    tone,
    items,
    title: t(`pages.review.brief.sections.${id}`),
    empty: t(`pages.review.brief.empty.${id}`)
  }
}
function item(task: ReviewTask, detail = '', meta: string | null | undefined = ''): BriefItem {
  return { task, detail, meta: meta || '' }
}
function unique(tasks: ReviewTask[]) {
  return [...new Map(tasks.map((task) => [task.id, task])).values()]
}
function visible(section: BriefSection) {
  return expanded.value.has(section.id) ? section.items : section.items.slice(0, previewLimit)
}
function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}
</script>

<template>
  <section
    class="review-daily-brief"
    aria-labelledby="review-daily-brief-title"
  >
    <header class="review-daily-brief__header">
      <div>
        <span>{{ $t('pages.review.brief.eyebrow') }}</span>
        <h2 id="review-daily-brief-title">{{ $t('pages.review.brief.title') }}</h2>
      </div>
      <dl class="review-daily-brief__metrics">
        <div>
          <dt>{{ $t('pages.review.brief.metrics.done') }}</dt>
          <dd>{{ data.completed.length + data.completedSubtasks.length }}</dd>
        </div>
        <div>
          <dt>{{ $t('pages.review.brief.metrics.progress') }}</dt>
          <dd>{{ data.metrics.completionPercent }}%</dd>
        </div>
        <div>
          <dt>{{ $t('pages.review.brief.metrics.focus') }}</dt>
          <dd>{{ data.focusMinutes }} {{ $t('pages.review.progress.minShort') }}</dd>
        </div>
        <div>
          <dt>{{ $t('pages.review.brief.metrics.carryover') }}</dt>
          <dd>{{ data.carriedOver.length }}</dd>
        </div>
      </dl>
    </header>

    <div class="review-daily-brief__grid">
      <article
        v-for="sectionItem in sections"
        :key="sectionItem.id"
        class="review-daily-brief__section surface-card"
        :data-tone="sectionItem.tone"
      >
        <header>
          <UIcon :name="sectionItem.icon" />
          <h3>{{ sectionItem.title }}</h3>
          <span>{{ sectionItem.items.length }}</span>
        </header>
        <div
          v-if="sectionItem.items.length"
          class="review-daily-brief__list"
        >
          <button
            v-for="briefItem in visible(sectionItem)"
            :key="briefItem.task.id"
            type="button"
            @click="emit('open', briefItem.task)"
          >
            <span class="review-daily-brief__marker" />
            <span class="review-daily-brief__content">
              <strong>{{ briefItem.task.title }}</strong>
              <small v-if="briefItem.detail">{{ briefItem.detail }}</small>
              <small
                v-if="briefItem.meta"
                class="review-daily-brief__meta"
                >{{ briefItem.meta }}</small
              >
            </span>
            <UIcon name="i-lucide-chevron-right" />
          </button>
        </div>
        <p
          v-else
          class="review-daily-brief__empty"
        >
          {{ sectionItem.empty }}
        </p>
        <button
          v-if="sectionItem.items.length > previewLimit"
          type="button"
          class="review-daily-brief__toggle"
          @click="toggle(sectionItem.id)"
        >
          {{
            expanded.has(sectionItem.id)
              ? $t('pages.review.brief.showLess')
              : $t('pages.review.brief.showMore', { count: sectionItem.items.length - previewLimit })
          }}
          <UIcon :name="expanded.has(sectionItem.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-daily-brief.css"></style>
