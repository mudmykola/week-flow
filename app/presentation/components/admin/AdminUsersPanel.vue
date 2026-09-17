<script setup lang="ts">
import type { AdminRole, AdminUser } from '~/domain/entities/admin'

defineProps<{
  users: AdminUser[]
  roles: AdminRole[]
  search: string
  roleFilter: AdminRole | null
  accountFilter: 'active' | 'disabled' | null
  sort: 'newest' | 'oldest' | 'name' | 'activity'
  selectedIds: string[]
  allVisibleSelected: boolean
}>()
defineEmits<{
  'update:search': [value: string]
  'update:roleFilter': [value: AdminRole | null]
  'update:accountFilter': [value: 'active' | 'disabled' | null]
  'update:sort': [value: 'newest' | 'oldest' | 'name' | 'activity']
  clearFilters: []
  selectBulkRole: [value: string | number | null | undefined]
  bulkStatus: [disabled: boolean]
  clearSelected: []
  toggleVisible: []
  toggleUser: [id: string]
  selectUser: [account: AdminUser]
}>()

const { t } = useI18n()
const roleLabel = (role: AdminRole) => t(`pages.admin.${role}`)
const roleIcon = (role: AdminRole) =>
  role === 'admin' ? 'i-lucide-shield-check' : role === 'pm' ? 'i-lucide-briefcase-business' : 'i-lucide-user'
</script>

<template>
  <section class="admin-users-panel admin-users">
    <div class="admin-toolbar surface-card">
      <label class="admin-toolbar__search"
        ><UIcon name="i-lucide-search" /><input
          :value="search"
          type="search"
          :aria-label="$t('pages.admin.search')"
          :placeholder="$t('pages.admin.search')"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      /></label>
      <FormSelect
        :model-value="roleFilter"
        :aria-label="$t('pages.admin.filterRole')"
        :placeholder="$t('pages.admin.allRoles')"
        @update:model-value="$emit('update:roleFilter', ($event as AdminRole | null) ?? null)"
        ><option
          v-for="role in roles"
          :key="role"
          :value="role"
        >
          {{ roleLabel(role) }}
        </option></FormSelect
      >
      <FormSelect
        :model-value="accountFilter"
        :aria-label="$t('pages.admin.filterStatus')"
        :placeholder="$t('pages.admin.allStatuses')"
        @update:model-value="$emit('update:accountFilter', ($event as 'active' | 'disabled' | null) ?? null)"
        ><option value="active">{{ $t('pages.admin.active') }}</option>
        <option value="disabled">{{ $t('pages.admin.disabled') }}</option></FormSelect
      >
      <FormSelect
        :model-value="sort"
        :aria-label="$t('pages.admin.sort')"
        @update:model-value="$emit('update:sort', $event as 'newest' | 'oldest' | 'name' | 'activity')"
        ><option value="newest">{{ $t('pages.admin.newest') }}</option>
        <option value="oldest">{{ $t('pages.admin.oldest') }}</option>
        <option value="name">{{ $t('pages.admin.byName') }}</option>
        <option value="activity">{{ $t('pages.admin.byActivity') }}</option></FormSelect
      >
      <IconButton
        v-if="search || roleFilter || accountFilter"
        icon="i-lucide-filter-x"
        :label="$t('pages.admin.clearFilters')"
        @click="$emit('clearFilters')"
      />
    </div>

    <div
      v-if="selectedIds.length"
      class="admin-bulk surface-card"
    >
      <span>{{ $t('pages.admin.selected', { count: selectedIds.length }) }}</span>
      <FormSelect
        :model-value="null"
        :aria-label="$t('pages.admin.bulkRole')"
        :placeholder="$t('pages.admin.bulkRole')"
        @update:model-value="$emit('selectBulkRole', $event)"
        ><option
          v-for="role in roles"
          :key="role"
          :value="role"
        >
          {{ roleLabel(role) }}
        </option></FormSelect
      >
      <AppButton
        size="sm"
        icon="i-lucide-user-check"
        @click="$emit('bulkStatus', false)"
        >{{ $t('pages.admin.activate') }}</AppButton
      >
      <AppButton
        size="sm"
        variant="danger"
        icon="i-lucide-user-x"
        @click="$emit('bulkStatus', true)"
        >{{ $t('pages.admin.block') }}</AppButton
      >
      <IconButton
        icon="i-lucide-x"
        :label="$t('common.close')"
        @click="$emit('clearSelected')"
      />
    </div>

    <div class="admin-table surface-card">
      <div class="admin-table__head">
        <FormCheckbox
          :model-value="allVisibleSelected"
          :aria-label="$t('pages.admin.selectAll')"
          @update:model-value="$emit('toggleVisible')"
        /><span>{{ $t('pages.admin.account') }}</span
        ><span>{{ $t('pages.admin.role') }}</span
        ><span>{{ $t('pages.admin.workload') }}</span
        ><span>{{ $t('pages.admin.access') }}</span
        ><span />
      </div>
      <div
        v-for="account in users"
        :key="account.id"
        class="admin-user"
      >
        <span class="admin-user__select"
          ><FormCheckbox
            :model-value="selectedIds.includes(account.id)"
            :aria-label="$t('pages.admin.selectUser', { name: account.name })"
            @update:model-value="$emit('toggleUser', account.id)"
        /></span>
        <button
          type="button"
          class="admin-user__identity"
          @click="$emit('selectUser', account)"
        >
          <NuxtImg
            v-if="account.avatarUrl"
            :src="account.avatarUrl"
            :alt="account.name"
            width="36"
            height="36"
          /><span
            v-else
            class="admin-user__avatar"
            >{{ account.name.slice(0, 1) }}</span
          ><span
            ><strong>{{ account.name }}</strong
            ><small>{{ account.email }}</small></span
          >
        </button>
        <SemanticBadge
          :tone="account.role === 'admin' ? 'violet' : account.role === 'pm' ? 'info' : 'neutral'"
          :icon="roleIcon(account.role)"
          >{{ roleLabel(account.role) }}</SemanticBadge
        >
        <span class="admin-user__workload"
          ><strong>{{ account.taskDone }}/{{ account.taskTotal }}</strong
          ><small :class="{ 'text-[var(--color-danger)]': account.taskOverdue }">{{
            $t('pages.admin.overdueCount', { count: account.taskOverdue })
          }}</small></span
        >
        <SemanticBadge
          :tone="account.disabledAt ? 'danger' : 'success'"
          :icon="account.disabledAt ? 'i-lucide-ban' : 'i-lucide-circle-check'"
          >{{ account.disabledAt ? $t('pages.admin.disabled') : $t('pages.admin.active') }}</SemanticBadge
        >
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('pages.admin.viewProfile', { name: account.name })"
          size="sm"
          @click="$emit('selectUser', account)"
        />
      </div>
      <EmptyState
        v-if="!users.length"
        :title="$t('pages.admin.noUsers')"
        :description="$t('pages.admin.noUsersHint')"
        icon="i-lucide-user-search"
      />
    </div>
  </section>
</template>
