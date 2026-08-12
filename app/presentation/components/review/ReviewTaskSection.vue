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
      <UIcon :name="icon" />
      <h2>{{ title }}</h2>
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
        <button
          v-for="task in tasks"
          :key="task.id"
          @click="$emit('open', task)"
        >
          <i /><span
            ><strong>{{ task.title }}</strong
            ><small
              >{{ task.projectName || $t('task.noProject')
              }}<template v-if="task.plannedTime"> · {{ task.plannedTime }}</template></small
            ></span
          ><UIcon name="i-lucide-chevron-right" />
        </button>
      </div>
    </BoundedTaskList>
    <p v-else>{{ empty }}</p>
  </AppSurface>
</template>
<style scoped>
.review-task-section {
  min-height: 13rem;
  padding: 0.7rem;
}
.review-task-section header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-bottom: 0.55rem;
}
.review-task-section header h2 {
  font-size: 0.82rem;
  font-weight: 800;
}
.review-task-section header span {
  margin-left: auto;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--color-bg-alt);
  font-size: 0.65rem;
}
.review-task-section--success header > svg {
  color: #10b981;
}
.review-task-section--accent header > svg {
  color: var(--color-accent);
}
.review-task-section--warning header > svg {
  color: #f59e0b;
}
.review-task-section__list {
  display: grid;
  gap: 0.3rem;
}
.review-task-section__list button {
  display: grid;
  grid-template-columns: 0.4rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.6rem;
  text-align: left;
}
.review-task-section__list button:hover {
  background: var(--color-bg-alt);
}
.review-task-section__list i {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--color-accent);
}
.review-task-section strong,
.review-task-section small {
  display: block;
}
.review-task-section strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
}
.review-task-section small,
.review-task-section > p {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}
.review-task-section > p {
  padding: 2.5rem 0.5rem;
  text-align: center;
}
</style>
