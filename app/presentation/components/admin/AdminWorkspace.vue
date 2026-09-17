<script setup lang="ts">
import type {
  AdminAuditEntry,
  AdminData,
  AdminPendingAction,
  AdminRole,
  AdminTeam,
  AdminUser
} from '~/domain/entities/admin'

const { user } = useUserSession()
const { t, locale } = useI18n()
const toast = useToast()
const { report } = useApiFeedback()
if (user.value?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: t('pages.admin.forbidden') })

const { data, status, error, refresh } = await useFetch<AdminData>('/api/admin/users')
const { data: audit, refresh: refreshAudit } = await useFetch<AdminAuditEntry[]>('/api/admin/audit')
useLiveRefresh('tasks', refresh)
useLiveRefresh('projects', refresh)
const activeTab = ref<'users' | 'teams' | 'audit'>('users')
const search = ref('')
const roleFilter = ref<AdminRole | null>(null)
const accountFilter = ref<'active' | 'disabled' | null>(null)
const sort = ref<'newest' | 'oldest' | 'name' | 'activity'>('newest')
const selectedIds = ref<string[]>([])
const selectedUser = ref<AdminUser | null>(null)
const pendingAction = ref<AdminPendingAction>(null)
const reason = ref('')
const saving = ref(false)
const roles: AdminRole[] = ['user', 'pm', 'admin']

const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase()
  return [...(data.value?.users ?? [])]
    .filter(
      (account) =>
        (!term || `${account.name} ${account.email}`.toLowerCase().includes(term)) &&
        (!roleFilter.value || account.role === roleFilter.value) &&
        (!accountFilter.value || (accountFilter.value === 'disabled' ? account.disabledAt : !account.disabledAt))
    )
    .sort((left, right) => {
      if (sort.value === 'name') return left.name.localeCompare(right.name, locale.value)
      if (sort.value === 'oldest') return left.createdAt - right.createdAt
      if (sort.value === 'activity') return (right.lastActivityAt ?? 0) - (left.lastActivityAt ?? 0)
      return right.createdAt - left.createdAt
    })
})
const allVisibleSelected = computed(
  () =>
    Boolean(filteredUsers.value.length) &&
    filteredUsers.value.every((account) => selectedIds.value.includes(account.id))
)
const managerOptions = computed(() =>
  (data.value?.users ?? []).filter((account) => !account.disabledAt && ['pm', 'admin'].includes(account.role))
)
const actionTitle = computed(() => {
  if (!pendingAction.value) return ''
  if (pendingAction.value.type === 'role' || pendingAction.value.type === 'bulk-role')
    return t('pages.admin.confirmRoleTitle')
  return pendingAction.value.disabled ? t('pages.admin.confirmBlockTitle') : t('pages.admin.confirmActivateTitle')
})

function formatDate(value: number | null) {
  if (!value) return t('pages.admin.never')
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(value)
}
function toggleVisible() {
  const visibleIds = filteredUsers.value.map((account) => account.id)
  selectedIds.value = allVisibleSelected.value
    ? selectedIds.value.filter((id) => !visibleIds.includes(id))
    : [...new Set([...selectedIds.value, ...visibleIds])]
}
function toggleUser(id: string) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}
function selectBulkRole(value: string | number | null | undefined) {
  if (typeof value === 'string' && roles.includes(value as AdminRole))
    pendingAction.value = { type: 'bulk-role', role: value as AdminRole }
}
function clearFilters() {
  search.value = ''
  roleFilter.value = null
  accountFilter.value = null
}
async function confirmAction() {
  const action = pendingAction.value
  if (!action) return
  saving.value = true
  try {
    if (action.type === 'role') {
      await $fetch(`/api/admin/users/${action.account.id}`, {
        method: 'PATCH',
        body: { role: action.role, reason: reason.value }
      })
    } else if (action.type === 'status') {
      await $fetch(`/api/admin/users/${action.account.id}`, {
        method: 'PATCH',
        body: { disabled: action.disabled, reason: reason.value }
      })
    } else {
      await $fetch('/api/admin/users/bulk', {
        method: 'PATCH',
        body: {
          ids: selectedIds.value,
          patch: action.type === 'bulk-role' ? { role: action.role } : { disabled: action.disabled },
          reason: reason.value
        }
      })
      selectedIds.value = []
    }
    pendingAction.value = null
    reason.value = ''
    await Promise.all([refresh(), refreshAudit()])
    selectedUser.value = selectedUser.value
      ? (data.value?.users.find((account) => account.id === selectedUser.value?.id) ?? null)
      : null
    toast.add({ title: t('pages.admin.changeSaved'), color: 'success' })
  } catch (caught) {
    report(caught)
  } finally {
    saving.value = false
  }
}
async function changeManager(team: AdminTeam, managerId: string) {
  try {
    await $fetch(`/api/admin/teams/${team.id}`, { method: 'PATCH', body: { managerId } })
    await Promise.all([refresh(), refreshAudit()])
    toast.add({ title: t('pages.admin.managerChanged'), color: 'success' })
  } catch (caught) {
    report(caught)
  }
}
function auditLabel(action: string) {
  const key = `pages.admin.auditActions.${action}`
  const translated = t(key)
  return translated === key ? action : translated
}
</script>

<template>
  <div class="admin-workspace admin-page app-container">
    <PageHeader
      :title="$t('pages.admin.title')"
      :description="$t('pages.admin.description')"
      icon="i-lucide-shield-check"
    >
      <template #actions
        ><AppButton
          class="admin-page__refresh"
          icon="i-lucide-refresh-cw"
          size="sm"
          @click="refresh"
          >{{ $t('pages.admin.refresh') }}</AppButton
        ></template
      >
    </PageHeader>

    <USkeleton
      v-if="status === 'pending'"
      class="h-72 rounded-2xl"
    />
    <EmptyState
      v-else-if="error"
      :title="$t('pages.admin.loadError')"
      :description="$t('pages.admin.loadErrorHint')"
      icon="i-lucide-triangle-alert"
      ><AppButton @click="refresh">{{ $t('common.tryAgain') }}</AppButton></EmptyState
    >
    <template v-else-if="data">
      <AdminMetrics :metrics="data.metrics" />
      <AdminTabs
        v-model="activeTab"
        :users="data.users.length"
        :teams="data.teams.length"
        :audit="audit?.length ?? 0"
      />

      <AdminUsersPanel
        v-if="activeTab === 'users'"
        v-model:search="search"
        v-model:role-filter="roleFilter"
        v-model:account-filter="accountFilter"
        v-model:sort="sort"
        :users="filteredUsers"
        :roles="roles"
        :selected-ids="selectedIds"
        :all-visible-selected="allVisibleSelected"
        @clear-filters="clearFilters"
        @select-bulk-role="selectBulkRole"
        @bulk-status="pendingAction = { type: 'bulk-status', disabled: $event }"
        @clear-selected="selectedIds = []"
        @toggle-visible="toggleVisible"
        @toggle-user="toggleUser"
        @select-user="selectedUser = $event"
      />

      <AdminTeamsPanel
        v-else-if="activeTab === 'teams'"
        :teams="data.teams"
        :managers="managerOptions"
        @change-manager="changeManager"
      />

      <AdminAuditPanel
        v-else
        :entries="audit ?? []"
        :format-date="formatDate"
        :label="auditLabel"
      />
    </template>

    <AdminUserDrawer
      :account="selectedUser"
      :current-user-id="user?.id"
      :roles="roles"
      :format-date="formatDate"
      @close="selectedUser = null"
      @action="pendingAction = $event"
    />

    <Modal
      :open="Boolean(pendingAction)"
      :title="actionTitle"
      size="sm"
      @close="pendingAction = null"
      ><p class="text-secondary text-sm">{{ $t('pages.admin.confirmHint') }}</p>
      <FormTextarea
        v-model="reason"
        class="mt-3"
        :placeholder="$t('pages.admin.reason')"
      /><template #footer
        ><AppButton
          variant="ghost"
          @click="pendingAction = null"
          >{{ $t('common.cancel') }}</AppButton
        ><AppButton
          :variant="
            pendingAction &&
            (pendingAction.type === 'status' || pendingAction.type === 'bulk-status') &&
            pendingAction.disabled
              ? 'danger'
              : 'primary'
          "
          :loading="saving"
          @click="confirmAction"
          >{{ $t('pages.admin.confirm') }}</AppButton
        ></template
      ></Modal
    >
  </div>
</template>

<style src="~/presentation/assets/css/pages/admin.css"></style>
