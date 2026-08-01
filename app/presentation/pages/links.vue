<script setup lang="ts">
import type { GraphNode } from '~/domain/services/graph'

const { graph, loading, load } = useGraphData()
const selected = ref<GraphNode | null>(null)

onMounted(load)

function handleSelect(node: GraphNode | null) {
  selected.value = node
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100vh-2.5rem)] max-w-[1800px] flex-col px-6 py-8 md:px-10">
    <header class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-3xl">Зв'язки</h1>
      <NuxtLink
        to="/"
        class="rounded-full border border-black/10 px-4 py-2 text-sm text-secondary hover:text-black"
      >
        ← Дошка
      </NuxtLink>
    </header>

    <div class="relative flex-1 overflow-hidden">
      <div class="glass-panel absolute inset-0">
        <p v-if="loading" class="p-6 text-sm text-secondary">Завантаження…</p>
        <GraphView v-else :nodes="graph.nodes" :edges="graph.edges" @select="handleSelect" />
      </div>

      <div v-if="selected" class="glass-panel absolute right-6 top-6 w-80 p-6">
        <div class="mb-3 flex items-center gap-2.5">
          <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: selected.color }" />
          <h2 class="font-display truncate text-lg">{{ selected.label }}</h2>
        </div>

        <template v-if="selected.kind === 'task'">
          <p class="mb-3 text-sm text-secondary">Тиждень: {{ selected.week }}</p>
          <NuxtLink
            :to="`/?week=${selected.week}`"
            class="inline-block rounded-full border border-black/10 px-4 py-2 text-sm text-secondary hover:text-black"
          >
            Відкрити на дошці →
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink
            :to="`/?project=${selected.id.replace('project:', '')}`"
            class="inline-block rounded-full border border-black/10 px-4 py-2 text-sm text-secondary hover:text-black"
          >
            Показати задачі проєкту →
          </NuxtLink>
        </template>

        <button
          type="button"
          class="mt-4 block text-sm text-secondary hover:text-black"
          @click="selected = null"
        >
          Закрити
        </button>
      </div>
    </div>
  </div>
</template>
