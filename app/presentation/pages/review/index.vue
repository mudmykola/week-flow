<script setup lang="ts">
import { fetchAllTasks, moveWeekTasks } from '~/data/repositories/tasksRepository'
import { getCurrentWeek, getNextWeek } from '~/domain/services/week'
import type { Task } from '~/domain/entities/task'
const tasks = ref<Task[]>([])
const loading = ref(true)
const moved = ref(false)
const notes = useLocalStorage(`weekflow-weekly-review-${getCurrentWeek()}`, '')
const { t, tm, rt } = useI18n()
const prompts = computed(() =>
  (tm('pages.review.prompts') as Array<Parameters<typeof rt>[0]>).map((prompt) => rt(prompt))
)
async function loadReview() {
  try {
    tasks.value = (await fetchAllTasks()).filter((task) => task.week === getCurrentWeek() && !task.archivedAt)
  } finally {
    loading.value = false
  }
}
onMounted(loadReview)
useLiveRefresh('tasks', loadReview)
const done = computed(() => tasks.value.filter((task) => task.status === 'done'))
const remaining = computed(() => tasks.value.filter((task) => task.status !== 'done'))
const score = computed(() => (tasks.value.length ? Math.round((done.value.length / tasks.value.length) * 100) : 0))
async function carryOver() {
  const result = await moveWeekTasks(getCurrentWeek(), getNextWeek(getCurrentWeek()))
  moved.value = true
  tasks.value = tasks.value.filter((task) => task.status === 'done')
  useToast().add({ title: t('pages.review.moved', { count: result.moved }), color: 'success' })
}
</script>
<template>
  <div class="review-page app-container max-w-6xl">
    <PageHeader
      :title="$t('nav.review')"
      :description="$t('pages.review.description')"
      icon="i-lucide-sparkles"
      ><template #actions
        ><UButton
          v-if="remaining.length && !moved"
          variant="soft"
          icon="i-lucide-forward"
          @click="carryOver"
          >{{ $t('pages.review.move') }}</UButton
        ></template
      ></PageHeader
    >
    <div
      v-if="loading"
      class="grid gap-4 md:grid-cols-3"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-40 rounded-2xl"
      />
    </div>
    <template v-else
      ><section class="grid gap-4 sm:grid-cols-3">
        <MetricCard
          :label="$t('pages.review.completed')"
          :value="done.length"
          icon="i-lucide-circle-check-big"
          tone="success"
        /><MetricCard
          :label="$t('pages.review.remaining')"
          :value="remaining.length"
          icon="i-lucide-list-todo"
          tone="warning"
        /><MetricCard
          :label="$t('pages.review.result')"
          :value="`${score}%`"
          icon="i-lucide-trophy"
          :tone="score >= 70 ? 'success' : 'accent'"
        />
      </section>
      <section class="mt-4 grid gap-4 lg:grid-cols-2">
        <article class="section-card">
          <h2 class="font-display mb-4 flex items-center gap-2 text-lg">
            <UIcon
              name="i-lucide-check-check"
              class="text-emerald-600"
            />{{ $t('pages.review.completed') }}
          </h2>
          <div
            v-if="done.length"
            class="space-y-2"
          >
            <p
              v-for="task in done"
              :key="task.id"
              class="flex gap-2 rounded-xl bg-[var(--color-bg-alt)] p-3 text-sm"
            >
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 shrink-0 text-emerald-600"
              />{{ task.title }}
            </p>
          </div>
          <p
            v-else
            class="text-secondary py-8 text-center text-sm"
          >
            {{ $t('pages.review.noCompleted') }}
          </p>
        </article>
        <article class="section-card">
          <h2 class="font-display mb-4 flex items-center gap-2 text-lg">
            <UIcon
              name="i-lucide-arrow-right"
              class="text-amber-600"
            />{{ $t('pages.review.remaining') }}
          </h2>
          <div
            v-if="remaining.length"
            class="space-y-2"
          >
            <p
              v-for="task in remaining"
              :key="task.id"
              class="flex gap-2 rounded-xl bg-[var(--color-bg-alt)] p-3 text-sm"
            >
              <UIcon
                name="i-lucide-circle"
                class="text-secondary mt-0.5 shrink-0"
              />{{ task.title }}
            </p>
          </div>
          <p
            v-else
            class="text-secondary py-8 text-center text-sm"
          >
            {{ $t('pages.review.fullyClosed') }}
          </p>
        </article>
      </section>
      <AppSurface class="mt-4"
        ><div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="font-display text-lg">{{ $t('pages.review.reflection') }}</h2>
            <p class="text-secondary mt-1 text-sm">{{ $t('pages.review.autosave') }}</p>
          </div>
          <UIcon
            name="i-lucide-cloud-check"
            class="text-emerald-600"
          />
        </div>
        <div class="mb-3 flex flex-wrap gap-2">
          <AppButton
            v-for="prompt in prompts"
            :key="prompt"
            variant="ghost"
            size="sm"
            @click="notes += `${notes ? '\n\n' : ''}${prompt}\n`"
            >{{ prompt }}</AppButton
          >
        </div>
        <FormTextarea
          v-model="notes"
          rows="9"
          class="min-h-60 leading-7"
          :placeholder="$t('pages.review.placeholder')" /></AppSurface
    ></template>
  </div>
</template>
