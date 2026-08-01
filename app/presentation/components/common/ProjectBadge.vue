<script setup lang="ts">
import type { Project } from '~/domain/entities/project'

defineProps<{
  project: Project | null
}>()
</script>

<template>
  <span
    v-if="project"
    class="project-badge text-secondary inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm"
    style="background-color: rgba(0, 0, 0, 0.04)"
  >
    <span
      class="h-2 w-2 rounded-full"
      :style="{ backgroundColor: project.color }"
    />
    {{ project.name }}
  </span>
</template>
