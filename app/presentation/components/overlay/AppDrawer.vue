<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(
  defineProps<{
    open: boolean
    title: string
    eyebrow?: string
    icon?: string
    size?: 'default' | 'wide' | 'fullscreen'
  }>(),
  {
    size: 'default'
  }
)
const emit = defineEmits<{ close: [] }>()
const attrs = useAttrs()
</script>

<template>
  <Teleport to="body"
    ><div
      v-if="open"
      class="app-drawer ui-overlay justify-end"
      v-bind="attrs"
      @click.self="emit('close')"
    >
      <aside
        class="app-drawer__panel ui-drawer"
        :class="{
          'ui-drawer--wide': size === 'wide',
          'ui-drawer--fullscreen': size === 'fullscreen'
        }"
      >
        <header class="app-drawer__header ui-drawer__header">
          <div class="flex min-w-0 items-center gap-3">
            <span
              v-if="icon"
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]"
            >
              <UIcon
                :name="icon"
                class="size-5"
              />
            </span>
            <div class="min-w-0">
              <p
                v-if="eyebrow"
                class="text-secondary text-[11px] font-semibold tracking-wide uppercase"
              >
                {{ eyebrow }}
              </p>
              <h2 class="font-display truncate text-xl sm:text-2xl">{{ title }}</h2>
            </div>
          </div>
          <IconButton
            icon="i-lucide-x"
            :label="$t('common.close')"
            @click="emit('close')"
          />
        </header>
        <div class="app-drawer__body ui-drawer__body"><slot /></div>
        <footer
          v-if="$slots.footer"
          class="app-drawer__footer ui-drawer__footer"
        >
          <slot name="footer" />
        </footer>
      </aside></div
  ></Teleport>
</template>
