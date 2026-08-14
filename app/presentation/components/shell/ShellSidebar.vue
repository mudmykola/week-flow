<script setup lang="ts">
import type { AppNavigationItem, NavigationSection } from '~/domain/services/navigation'

defineProps<{
  groups: Array<{ section: NavigationSection; items: AppNavigationItem[] }>
  user?: { name: string; email: string; avatarUrl: string | null } | null
  inboxCount: number
  todayCount: number
}>()
const emit = defineEmits<{ search: []; logout: [] }>()
const mobileOpen = defineModel<boolean>('mobileOpen', { required: true })
const collapsed = defineModel<boolean>('collapsed', { required: true })
const route = useRoute()
</script>

<template>
  <aside
    class="shell-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3 transition-[transform,width] lg:translate-x-0"
    :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-20' : 'lg:w-64']"
  >
    <div class="shell-sidebar__brand mb-5 flex shrink-0 items-center justify-between px-2 py-2">
      <NuxtLink
        to="/"
        class="flex items-center gap-3"
        @click="mobileOpen = false"
      >
        <BrandLogo :class="{ 'shell-sidebar__logo--collapsed': collapsed }" />
      </NuxtLink>
      <IconButton
        class="lg:hidden"
        icon="i-lucide-x"
        :label="$t('shell.closeMenu')"
        variant="ghost"
        @click="mobileOpen = false"
      />
    </div>

    <button
      class="shell-sidebar__search text-secondary mb-3 flex w-full shrink-0 items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-3 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
      @click="emit('search')"
    >
      <UIcon
        name="i-lucide-search"
        class="size-4"
      />
      <span
        class="flex-1"
        :class="collapsed ? 'lg:hidden' : ''"
        >{{ $t('common.search') }}</span
      ><kbd
        class="text-xs"
        :class="collapsed ? 'lg:hidden' : ''"
        >⌘K</kbd
      >
    </button>

    <nav class="shell-sidebar__navigation app-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <div
        v-for="group in groups"
        :key="group.section"
      >
        <p
          class="text-secondary mb-1 px-3 text-[10px] font-semibold tracking-wide uppercase"
          :class="collapsed ? 'lg:hidden' : ''"
        >
          {{ $t(`shell.section.${group.section}`) }}
        </p>
        <div class="space-y-1">
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="text-secondary relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/[0.04] hover:text-[var(--color-text-primary)] dark:hover:bg-white/[0.05]"
            :class="
              route.path === item.to ? 'bg-black/[0.06] text-[var(--color-text-primary)] dark:bg-white/[0.08]' : ''
            "
            :title="collapsed ? item.label : undefined"
            @click="mobileOpen = false"
          >
            <UIcon
              :name="item.icon"
              class="size-4.5 shrink-0"
            />
            <span
              class="flex-1"
              :class="collapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-4 lg:px-1 lg:text-[9px]' : ''"
              >{{ item.label }}</span
            >
            <span
              v-if="item.to === '/inbox' && inboxCount"
              class="rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-xs font-semibold text-[var(--color-accent)]"
              :class="collapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-4 lg:px-1 lg:text-[9px]' : ''"
              >{{ inboxCount }}</span
            >
            <span
              v-else-if="item.to === '/today' && todayCount"
              class="rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-xs font-semibold text-[var(--color-accent)]"
              :class="collapsed ? 'lg:hidden' : ''"
              >{{ todayCount }}</span
            >
          </NuxtLink>
        </div>
      </div>
    </nav>

    <IconButton
      class="shell-sidebar__collapse mt-2 ml-auto hidden lg:grid"
      :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
      :label="collapsed ? $t('shell.expandMenu') : $t('shell.collapseMenu')"
      variant="ghost"
      size="sm"
      @click="collapsed = !collapsed"
    />
    <div
      class="shell-sidebar__account mt-2 flex shrink-0 items-center gap-3 rounded-xl border border-[var(--color-panel-border)] p-3"
    >
      <NuxtImg
        v-if="user?.avatarUrl"
        :src="user.avatarUrl"
        width="32"
        height="32"
        class="size-8 rounded-full"
        alt=""
      />
      <div
        class="min-w-0 flex-1"
        :class="collapsed ? 'lg:hidden' : ''"
      >
        <p class="truncate text-sm font-medium">{{ user?.name }}</p>
        <p class="text-secondary truncate text-xs">{{ user?.email }}</p>
      </div>
      <IconButton
        icon="i-lucide-log-out"
        :label="$t('shell.logout')"
        variant="ghost"
        size="sm"
        @click="emit('logout')"
      />
    </div>
  </aside>
</template>

<style scoped>
@media (min-width: 1024px) {
  .shell-sidebar__logo--collapsed :deep(.brand-logo__wordmark) {
    display: none;
  }
}
</style>
