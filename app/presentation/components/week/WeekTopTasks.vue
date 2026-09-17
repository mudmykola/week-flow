<script setup lang="ts">
import type { Task } from '~/domain/entities/task'

defineProps<{ tasks: Task[]; selectedCount: number }>()
defineEmits<{ edit: [task: Task]; add: [] }>()
</script>

<template>
  <section class="week-top-tasks week-board-page__top">
    <header>
      <div>
        <UIcon name="i-lucide-trophy" />
        <h2>{{ $t('board.weekTop') }}</h2>
        <span>{{ tasks.length }}/3</span>
      </div>
      <p>{{ $t('board.weekTopHint') }}</p>
    </header>
    <div class="week-board-page__top-list">
      <button
        v-for="task in tasks"
        :key="task.id"
        @click="$emit('edit', task)"
      >
        <b>{{ task.weekRank }}</b
        ><span>{{ task.title }}</span
        ><UIcon name="i-lucide-arrow-up-right" /></button
      ><button
        v-if="tasks.length < 3"
        class="week-board-page__top-add"
        @click="$emit('add')"
      >
        <UIcon name="i-lucide-plus" />{{ selectedCount ? $t('board.addSelectedTop') : $t('board.selectTopHint') }}
      </button>
    </div>
  </section>
</template>
