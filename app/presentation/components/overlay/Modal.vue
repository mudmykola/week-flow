<script setup lang="ts">
defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body"
    ><div
      v-if="open"
      class="modal ui-overlay items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <section
        class="modal__panel ui-modal"
        :class="size === 'sm' ? 'modal__panel--sm max-w-md' : 'modal__panel--md max-w-xl'"
      >
        <header class="modal__header mb-4 flex items-center justify-between">
          <h2 class="modal__title font-display text-xl">{{ title }}</h2>
          <IconButton
            icon="i-lucide-x"
            :label="$t('common.close')"
            @click="emit('close')"
          />
        </header>
        <slot />
        <footer
          v-if="$slots.footer"
          class="modal__footer mt-5 flex justify-end gap-2"
        >
          <slot name="footer" />
        </footer>
      </section></div
  ></Teleport>
</template>
