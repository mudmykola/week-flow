<script setup lang="ts">
import type { AppNavigationItem, NavigationSection } from '~/domain/services/navigation'

const props = defineProps<{
  groups: Array<{ section: NavigationSection; items: AppNavigationItem[] }>
  user?: { name: string; email: string; avatarUrl: string | null } | null
  inboxCount: number
  todayCount: number
  goalsCount: number
}>()
const emit = defineEmits<{ search: []; logout: [] }>()
const mobileOpen = defineModel<boolean>('mobileOpen', { required: true })
const collapsed = defineModel<boolean>('collapsed', { required: true })
const route = useRoute()
const primaryGroups = computed(() => props.groups.filter((group) => group.section !== 'system'))
const systemItems = computed(() => props.groups.find((group) => group.section === 'system')?.items ?? [])

function countFor(item: AppNavigationItem) {
  if (item.to === '/inbox') return props.inboxCount
  if (item.to === '/today') return props.todayCount
  if (item.to === '/goals') return props.goalsCount
  return 0
}

function isActive(item: AppNavigationItem) {
  return route.path === item.to || (item.to !== '/' && route.path.startsWith(`${item.to}/`))
}
</script>

<template>
  <aside
    class="shell-sidebar fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2.5 py-3 transition-[transform,width] lg:translate-x-0"
    :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-[4.25rem]' : 'lg:w-[17rem]']"
  >
    <div class="shell-sidebar__mobile-close absolute top-3 right-3 lg:hidden">
      <IconButton
        icon="i-lucide-x"
        :label="$t('shell.closeMenu')"
        variant="ghost"
        size="sm"
        @click="mobileOpen = false"
      />
    </div>

    <div
      class="shell-sidebar__brand flex h-12 shrink-0 items-center px-1"
      :class="collapsed ? 'lg:justify-center' : ''"
    >
      <NuxtLink
        to="/"
        class="flex min-w-0 items-center gap-3"
        @click="mobileOpen = false"
      >
        <BrandLogo :class="{ 'shell-sidebar__logo--collapsed': collapsed }" />
      </NuxtLink>
    </div>

    <IconButton
      class="shell-sidebar__collapse absolute top-[4.6rem] -right-3 hidden rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-sm lg:grid"
      :icon="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
      :label="collapsed ? $t('shell.expandMenu') : $t('shell.collapseMenu')"
      variant="ghost"
      size="sm"
      @click="collapsed = !collapsed"
    />

    <button
      class="shell-sidebar__search text-secondary mt-3 mb-3 flex h-10 w-full shrink-0 items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-3 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
      :class="collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''"
      :title="collapsed ? $t('common.search') : undefined"
      @click="emit('search')"
    >
      <UIcon
        name="i-lucide-search"
        class="size-4 shrink-0"
      />
      <span
        class="flex-1"
        :class="collapsed ? 'lg:hidden' : ''"
        >{{ $t('common.search') }}</span
      >
      <kbd
        class="text-xs"
        :class="collapsed ? 'lg:hidden' : ''"
        >⌘K</kbd
      >
    </button>

    <nav class="shell-sidebar__navigation app-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5 py-1">
      <section
        v-for="group in primaryGroups"
        :key="group.section"
        class="shell-sidebar__group"
      >
        <p
          class="text-secondary mb-1 px-3 text-[10px] font-bold tracking-[0.08em] uppercase"
          :class="collapsed ? 'lg:hidden' : ''"
        >
          {{ $t(`shell.section.${group.section}`) }}
        </p>
        <div class="space-y-1">
          <ShellNavigationItem
            v-for="item in group.items"
            :key="item.to"
            :item="item"
            :collapsed="collapsed"
            :active="isActive(item)"
            :count="countFor(item)"
            @navigate="mobileOpen = false"
          />
        </div>
      </section>
    </nav>

    <div class="shell-sidebar__utilities mt-2 space-y-1 border-t border-[var(--color-panel-border)] pt-2">
      <ShellNavigationItem
        v-for="item in systemItems"
        :key="item.to"
        :item="item"
        :collapsed="collapsed"
        :active="isActive(item)"
        @navigate="mobileOpen = false"
      />
    </div>

    <details class="shell-sidebar__account relative mt-2 shrink-0">
      <summary
        class="flex h-12 cursor-pointer list-none items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-2.5 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        :class="collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''"
        :title="collapsed ? user?.name : undefined"
      >
        <NuxtImg
          v-if="user?.avatarUrl"
          :src="user.avatarUrl"
          width="32"
          height="32"
          class="size-8 shrink-0 rounded-full"
          alt=""
        />
        <span
          v-else
          class="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]"
        >
          {{ user?.name?.slice(0, 1) }}
        </span>
        <span
          class="min-w-0 flex-1"
          :class="collapsed ? 'lg:hidden' : ''"
        >
          <span class="block truncate text-sm font-semibold">{{ user?.name }}</span>
          <span class="text-secondary block truncate text-[11px]">{{ user?.email }}</span>
        </span>
        <UIcon
          name="i-lucide-chevrons-up-down"
          class="text-secondary size-4"
          :class="collapsed ? 'lg:hidden' : ''"
        />
      </summary>
      <div
        class="shell-sidebar__account-menu absolute bottom-14 z-50 w-56 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1.5 shadow-xl"
        :class="collapsed ? 'left-0 lg:left-14' : 'inset-x-0'"
      >
        <div class="border-b border-[var(--color-panel-border)] px-2 py-2">
          <p class="truncate text-sm font-semibold">{{ user?.name }}</p>
          <p class="text-secondary truncate text-xs">{{ user?.email }}</p>
        </div>
        <NuxtLink
          to="/settings"
          class="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          @click="mobileOpen = false"
        >
          <UIcon
            name="i-lucide-settings-2"
            class="size-4"
          />{{ $t('nav.settings') }}
        </NuxtLink>
        <NuxtLink
          to="/about"
          class="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          @click="mobileOpen = false"
        >
          <UIcon
            name="i-lucide-user-round"
            class="size-4"
          />{{ $t('nav.about') }}
        </NuxtLink>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
          @click="emit('logout')"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          />{{ $t('shell.logout') }}
        </button>
      </div>
    </details>
  </aside>
</template>

<style scoped>
@media (min-width: 1024px) {
  .shell-sidebar__logo--collapsed :deep(.brand-logo__wordmark) {
    display: none;
  }
}
.shell-sidebar__account:not([open]) .shell-sidebar__account-menu {
  display: none;
}
</style>
