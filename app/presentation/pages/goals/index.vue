<script setup lang="ts">
import type { Goal } from '~/domain/entities/goal'
import { isGoalDueSoon, isGoalOverdue } from '~/domain/services/goals'

const goalsStore = useGoalsStore()
const loading = ref(true)

onMounted(async () => {
  try {
    await goalsStore.loadGoals()
  } finally {
    loading.value = false
  }
})

useLiveRefresh('goals', () => goalsStore.loadGoals())

function updateProgress(goal: Goal, progress: number) {
  void goalsStore.patchGoal(goal.id, { progress })
}

function urgencyClass(goal: Goal) {
  if (isGoalOverdue(goal)) return 'border-l-2 border-[var(--color-danger)]'
  if (isGoalDueSoon(goal)) return 'border-l-2 border-amber-500/60'
  return ''
}
</script>

<template>
  <div class="goals-page app-container max-w-5xl">
    <PageHeader
      :title="$t('nav.goals')"
      :description="$t('pages.goals.description')"
      icon="i-lucide-target"
      :count="goalsStore.goals.length"
    />
    <div
      v-if="loading"
      class="space-y-2"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-28 rounded-xl"
      />
    </div>
    <EmptyState
      v-else-if="!goalsStore.goals.length"
      :title="$t('pages.goals.empty')"
      :description="$t('pages.goals.emptyHint')"
      icon="i-lucide-target"
    />
    <template v-else>
      <section
        v-if="goalsStore.activeGoals.length"
        class="space-y-2"
      >
        <h2 class="text-secondary text-sm font-semibold">{{ $t('pages.goals.activeSection') }}</h2>
        <article
          v-for="goal in goalsStore.activeGoals"
          :key="goal.id"
          class="surface-card p-4"
          :class="urgencyClass(goal)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-display">{{ goal.title }}</h3>
              <p
                v-if="goal.description"
                class="text-secondary mt-1 text-sm"
              >
                {{ goal.description }}
              </p>
              <p
                v-if="goal.projectName"
                class="text-secondary mt-2 text-xs"
              >
                <UIcon
                  name="i-lucide-link"
                  class="mr-1 inline"
                />{{ $t('pages.goals.linkedTo', { project: goal.projectName }) }}
              </p>
              <p
                v-if="goal.dueDate"
                class="mt-2 text-xs"
                :class="isGoalOverdue(goal) ? 'text-[var(--color-danger)]' : 'text-secondary'"
              >
                <UIcon
                  name="i-lucide-calendar"
                  class="mr-1 inline"
                />{{ $t('pages.goals.until', { date: goal.dueDate }) }}
                <span v-if="isGoalOverdue(goal)">· {{ $t('pages.goals.overdueBadge') }}</span>
                <span v-else-if="isGoalDueSoon(goal)">· {{ $t('pages.goals.dueSoonBadge') }}</span>
              </p>
            </div>
            <strong class="text-[var(--color-accent)]">{{ goal.progress }}%</strong>
          </div>
          <div
            v-if="goal.projectId"
            class="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]"
          >
            <div
              class="h-full rounded-full"
              style="background-color: var(--color-accent)"
              :style="{ width: `${goal.progress}%` }"
            />
          </div>
          <input
            v-else
            :value="goal.progress"
            type="range"
            min="0"
            max="100"
            step="10"
            class="mt-4 w-full accent-[var(--color-accent)]"
            @change="updateProgress(goal, Number(($event.target as HTMLInputElement).value))"
          />
        </article>
      </section>
      <section
        v-if="goalsStore.completedGoals.length"
        class="mt-4 space-y-2"
      >
        <h2 class="text-secondary text-sm font-semibold">{{ $t('pages.goals.completedSection') }}</h2>
        <article
          v-for="goal in goalsStore.completedGoals"
          :key="goal.id"
          class="surface-card p-4 opacity-70"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-display">{{ goal.title }}</h3>
            <UIcon
              name="i-lucide-circle-check-big"
              class="text-[var(--color-success)]"
            />
          </div>
        </article>
      </section>
    </template>
  </div>
</template>
