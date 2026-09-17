<script setup lang="ts">
export type AdminTab = 'users' | 'teams' | 'audit'
defineProps<{ modelValue: AdminTab; users: number; teams: number; audit: number }>()
defineEmits<{ 'update:modelValue': [value: AdminTab] }>()
</script>

<template>
  <nav
    class="admin-tabs"
    :aria-label="$t('pages.admin.sections')"
  >
    <button
      v-for="tab in ['users', 'teams', 'audit'] as const"
      :key="tab"
      type="button"
      class="admin-tabs__button"
      :class="{ 'admin-tabs__button--active': modelValue === tab }"
      @click="$emit('update:modelValue', tab)"
    >
      <UIcon
        :name="tab === 'users' ? 'i-lucide-users' : tab === 'teams' ? 'i-lucide-network' : 'i-lucide-scroll-text'"
      />{{ $t(`pages.admin.tabs.${tab}`) }}<span>{{ tab === 'users' ? users : tab === 'teams' ? teams : audit }}</span>
    </button>
  </nav>
</template>
