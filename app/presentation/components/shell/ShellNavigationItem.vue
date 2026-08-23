<script setup lang="ts">
import type { AppNavigationItem } from '~/domain/services/navigation'

defineProps<{ item: AppNavigationItem; collapsed: boolean; active: boolean; count?: number }>()
const emit = defineEmits<{ navigate: [] }>()
</script>

<template>
  <NuxtLink
    :to="item.to"
    class="shell-navigation-item text-secondary relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors hover:bg-black/[0.04] hover:text-[var(--color-text-primary)] dark:hover:bg-white/[0.05]"
    :class="[
      collapsed ? 'lg:justify-center lg:px-0' : '',
      active ? 'bg-black/[0.06] text-[var(--color-text-primary)] dark:bg-white/[0.08]' : ''
    ]"
    :title="collapsed ? item.label : undefined"
    @click="emit('navigate')"
  >
    <UIcon
      :name="item.icon"
      class="size-[18px] shrink-0"
    />
    <span
      class="shell-navigation-item__label min-w-0 flex-1 truncate"
      :class="collapsed ? 'lg:hidden' : ''"
      >{{ item.label }}</span
    >
    <span
      v-if="count"
      class="shell-navigation-item__badge rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent)]"
      :class="
        collapsed ? 'lg:absolute lg:top-0.5 lg:right-0.5 lg:min-w-3.5 lg:px-0.5 lg:text-center lg:text-[8px]' : ''
      "
      >{{ count > 9 ? '9+' : count }}</span
    >
  </NuxtLink>
</template>
