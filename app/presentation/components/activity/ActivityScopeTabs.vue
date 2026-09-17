<script setup lang="ts">
import type { ActivityScope } from '~/domain/services/activityFeed'

defineProps<{ modelValue: ActivityScope }>()
const emit = defineEmits<{ 'update:modelValue': [value: ActivityScope] }>()
const tabs: Array<{ value: ActivityScope; icon: string }> = [
  { value: 'mine', icon: 'i-lucide-user-round' },
  { value: 'team', icon: 'i-lucide-users-round' },
  { value: 'all', icon: 'i-lucide-list-filter' }
]
</script>

<template>
  <nav
    class="activity-scope-tabs surface-card"
    :aria-label="$t('pages.activity.scopeLabel')"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      :class="{ 'is-active': modelValue === tab.value }"
      @click="emit('update:modelValue', tab.value)"
    >
      <UIcon :name="tab.icon" />
      {{ $t(`pages.activity.scopes.${tab.value}`) }}
    </button>
  </nav>
</template>

<style scoped src="~/presentation/assets/css/components/activity/activity-scope-tabs.css"></style>
