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
