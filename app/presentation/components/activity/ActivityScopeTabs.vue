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

<style scoped>
.activity-scope-tabs {
  display: inline-flex;
  gap: 0.2rem;
  padding: 0.25rem;
}
.activity-scope-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.7rem;
  border-radius: 0.55rem;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
}
.activity-scope-tabs button.is-active {
  color: var(--color-text-primary);
  background: var(--color-bg-alt);
}
@media (max-width: 640px) {
  .activity-scope-tabs {
    display: flex;
    width: 100%;
  }
  .activity-scope-tabs button {
    flex: 1;
    justify-content: center;
  }
}
</style>
