<script setup lang="ts">
const props = withDefaults(
  defineProps<{ count: number; preview?: number; rowHeight?: number; storageKey?: string }>(),
  { preview: 5, rowHeight: 72, storageKey: '' }
)
const generatedId = useId()
const expanded = props.storageKey ? useLocalStorage(`weekflow-list-expanded-${props.storageKey}`, false) : ref(false)
const contentId = computed(() => `bounded-task-list-${generatedId}`)
const overflowing = computed(() => props.count > props.preview)
const remaining = computed(() => Math.max(0, props.count - props.preview))
const style = computed(() => ({ '--bounded-preview-height': `${props.preview * props.rowHeight}px` }))
watch(
  () => props.count,
  (count) => {
    if (count <= props.preview) expanded.value = false
  }
)
</script>

<template>
  <div
    class="bounded-task-list"
    :class="{ 'bounded-task-list--expanded': expanded, 'bounded-task-list--overflowing': overflowing }"
    :style="style"
  >
    <div
      :id="contentId"
      class="bounded-task-list__viewport app-scrollbar"
      tabindex="0"
    >
      <slot />
    </div>
    <button
      v-if="overflowing"
      type="button"
      class="bounded-task-list__toggle"
      :aria-expanded="expanded"
      :aria-controls="contentId"
      @click="expanded = !expanded"
    >
      <UIcon :name="expanded ? 'i-lucide-chevrons-up' : 'i-lucide-chevrons-down'" />
      {{ expanded ? $t('common.collapseList') : $t('common.showMoreItems', { count: remaining }) }}
    </button>
  </div>
</template>

<style scoped>
.bounded-task-list {
  position: relative;
  min-width: 0;
}
.bounded-task-list__viewport {
  min-height: 0;
}
.bounded-task-list--overflowing:not(.bounded-task-list--expanded) .bounded-task-list__viewport {
  max-height: var(--bounded-preview-height);
  overflow: hidden;
}
.bounded-task-list--overflowing:not(.bounded-task-list--expanded)::after {
  position: absolute;
  right: 0;
  bottom: 2.35rem;
  left: 0;
  height: 2.5rem;
  pointer-events: none;
  background: linear-gradient(transparent, var(--color-panel-bg));
  content: '';
}
.bounded-task-list--expanded .bounded-task-list__viewport {
  max-height: min(58vh, 38rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.bounded-task-list__toggle {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  min-height: 2.15rem;
  margin-top: 0.35rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--color-panel-bg) 92%, var(--color-bg-alt));
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
}
.bounded-task-list__toggle:hover,
.bounded-task-list__toggle:focus-visible {
  border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-panel-border));
  color: var(--color-accent);
}
@media (max-width: 640px) {
  .bounded-task-list--expanded .bounded-task-list__viewport {
    max-height: min(52vh, 30rem);
  }
}
</style>
