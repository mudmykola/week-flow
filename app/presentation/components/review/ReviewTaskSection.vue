<script setup lang="ts">
import type { ReviewTask } from '~/domain/entities/review'
defineProps<{
  title: string
  icon: string
  tone: 'success' | 'accent' | 'warning'
  tasks: ReviewTask[]
  empty: string
}>()
defineEmits<{ open: [task: ReviewTask] }>()
</script>
<template>
  <AppSurface
    class="review-task-section"
    :class="`review-task-section--${tone}`"
  >
    <header>
      <SemanticBadge
        :tone="tone === 'accent' ? 'info' : tone"
        :icon="icon"
        >{{ title }}</SemanticBadge
      >
      <span>{{ tasks.length }}</span>
    </header>
    <BoundedTaskList
      v-if="tasks.length"
      :count="tasks.length"
      :preview="5"
      :row-height="52"
      :storage-key="`review-${tone}-${title}`"
    >
      <div class="review-task-section__list">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="review-task-section__task"
        >
          <i /><span
            ><strong>{{ task.title }}</strong
            ><small
              >{{ task.projectName || $t('task.noProject')
              }}<template v-if="task.plannedTime"> · {{ task.plannedTime }}</template></small
            ></span
          ><IconButton
            icon="i-lucide-square-arrow-out-up-right"
            :label="$t('pages.review.progress.openTask')"
            size="sm"
            @click="$emit('open', task)"
          />
        </div>
      </div>
    </BoundedTaskList>
    <p v-else>{{ empty }}</p>
  </AppSurface>
</template>
<style scoped src="~/presentation/assets/css/components/review/review-task-section.css"></style>
