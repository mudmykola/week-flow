<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
defineProps<{ tasks: Task[]; selectedId: string }>()
const emit = defineEmits<{ select: [id: string]; move: [id: string, direction: -1 | 1]; remove: [id: string] }>()
</script>

<template>
  <aside class="focus-queue surface-card p-3">
    <h2 class="text-secondary mb-2 flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
      <UIcon name="i-lucide-list-ordered" />{{ $t('pages.focus.queue') }}
    </h2>
    <div class="space-y-1">
      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        class="focus-queue__item flex items-center gap-1 rounded-xl"
        :class="task.id === selectedId ? 'bg-[var(--color-bg-alt)]' : ''"
      >
        <button
          class="min-w-0 flex-1 p-2 text-left"
          @click="emit('select', task.id)"
        >
          <span class="line-clamp-2 text-sm font-medium">{{ task.title }}</span>
          <span class="text-secondary text-[11px]">{{ $t(`task.priorityValue.${task.priority}`) }}</span>
        </button>
        <IconButton
          icon="i-lucide-chevron-up"
          :label="$t('pages.focus.moveUp')"
          size="sm"
          :disabled="index === 0"
          @click="emit('move', task.id, -1)"
        />
        <IconButton
          icon="i-lucide-chevron-down"
          :label="$t('pages.focus.moveDown')"
          size="sm"
          :disabled="index === tasks.length - 1"
          @click="emit('move', task.id, 1)"
        />
        <IconButton
          icon="i-lucide-x"
          :label="$t('common.delete')"
          size="sm"
          @click="emit('remove', task.id)"
        />
      </div>
    </div>
  </aside>
</template>
