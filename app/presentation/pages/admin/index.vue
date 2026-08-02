<script setup lang="ts">
type Role = 'user' | 'pm' | 'admin'
type AdminUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: Role
  disabledAt: number | null
  createdAt: number
  updatedAt: number
  taskTotal: number
  taskDone: number
  taskOverdue: number
  projectCount: number
  teamCount: number
  lastActivityAt: number | null
}
type AdminTeam = { id: string; name: string; managerId: string; managerName: string; memberCount: number }
type AdminData = {
  users: AdminUser[]
  teams: AdminTeam[]
  metrics: {
    users: number
    admins: number
    managers: number
    disabled: number
    newUsers: number
    teams: number
    projects: number
    tasks: number
    overdue: number
  }
}
type AuditEntry = {
  id: string
  action: string
  metadata: Record<string, unknown>
  createdAt: number
  actor: { id: string; name: string; email: string } | null
  target: { id: string; name: string; email: string } | null
}
type PendingAction =
  | { type: 'role'; account: AdminUser; role: Role }
  | { type: 'status'; account: AdminUser; disabled: boolean }
  | { type: 'bulk-role'; role: Role }
  | { type: 'bulk-status'; disabled: boolean }
  | null

const { user } = useUserSession()
const { t, locale } = useI18n()
const toast = useToast()
const { report } = useApiFeedback()
if (user.value?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: t('pages.admin.forbidden') })

const { data, status, error, refresh } = await useFetch<AdminData>('/api/admin/users')
const { data: audit, refresh: refreshAudit } = await useFetch<AuditEntry[]>('/api/admin/audit')
const activeTab = ref<'users' | 'teams' | 'audit'>('users')
const search = ref('')
const roleFilter = ref<Role | null>(null)
const accountFilter = ref<'active' | 'disabled' | null>(null)
const sort = ref<'newest' | 'oldest' | 'name' | 'activity'>('newest')
const selectedIds = ref<string[]>([])
const selectedUser = ref<AdminUser | null>(null)
const pendingAction = ref<PendingAction>(null)
const reason = ref('')
const saving = ref(false)
const roles: Role[] = ['user', 'pm', 'admin']

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

function roleLabel(role: Role) {
  return t(`pages.admin.${role}`)
}
function roleIcon(role: Role) {
  return role === 'admin' ? 'i-lucide-shield-check' : role === 'pm' ? 'i-lucide-briefcase-business' : 'i-lucide-user'
}
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
  if (typeof value === 'string' && roles.includes(value as Role))
    pendingAction.value = { type: 'bulk-role', role: value as Role }
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
  <div class="admin-page app-container max-w-7xl">
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
      <section class="admin-metrics">
        <MetricCard
          :label="$t('pages.admin.totalUsers')"
          :value="data.metrics.users"
          :trend="$t('pages.admin.newUsers', { count: data.metrics.newUsers })"
          icon="i-lucide-users"
        />
        <MetricCard
          :label="$t('pages.admin.managers')"
          :value="data.metrics.managers"
          :hint="$t('pages.admin.adminCount', { count: data.metrics.admins })"
          icon="i-lucide-user-cog"
        />
        <MetricCard
          :label="$t('pages.admin.teamsProjects')"
          :value="`${data.metrics.teams}/${data.metrics.projects}`"
          icon="i-lucide-network"
        />
        <MetricCard
          :label="$t('pages.admin.systemTasks')"
          :value="data.metrics.tasks"
          :hint="$t('pages.admin.overdueCount', { count: data.metrics.overdue })"
          icon="i-lucide-list-checks"
          :tone="data.metrics.overdue ? 'danger' : undefined"
        />
      </section>

      <nav
        class="admin-tabs"
        :aria-label="$t('pages.admin.sections')"
      >
        <button
          v-for="tab in ['users', 'teams', 'audit'] as const"
          :key="tab"
          type="button"
          class="admin-tabs__button"
          :class="{ 'admin-tabs__button--active': activeTab === tab }"
          @click="activeTab = tab"
        >
          <UIcon
            :name="tab === 'users' ? 'i-lucide-users' : tab === 'teams' ? 'i-lucide-network' : 'i-lucide-scroll-text'"
          />{{ $t(`pages.admin.tabs.${tab}`)
          }}<span>{{
            tab === 'users' ? data.users.length : tab === 'teams' ? data.teams.length : (audit?.length ?? 0)
          }}</span>
        </button>
      </nav>

      <section
        v-if="activeTab === 'users'"
        class="admin-users"
      >
        <div class="admin-toolbar surface-card">
          <label class="admin-toolbar__search"
            ><UIcon name="i-lucide-search" /><input
              v-model="search"
              type="search"
              :aria-label="$t('pages.admin.search')"
              :placeholder="$t('pages.admin.search')"
          /></label>
          <FormSelect
            v-model="roleFilter"
            :aria-label="$t('pages.admin.filterRole')"
            :placeholder="$t('pages.admin.allRoles')"
            ><option
              v-for="role in roles"
              :key="role"
              :value="role"
            >
              {{ roleLabel(role) }}
            </option></FormSelect
          >
          <FormSelect
            v-model="accountFilter"
            :aria-label="$t('pages.admin.filterStatus')"
            :placeholder="$t('pages.admin.allStatuses')"
            ><option value="active">{{ $t('pages.admin.active') }}</option>
            <option value="disabled">{{ $t('pages.admin.disabled') }}</option></FormSelect
          >
          <FormSelect
            v-model="sort"
            :aria-label="$t('pages.admin.sort')"
            ><option value="newest">{{ $t('pages.admin.newest') }}</option>
            <option value="oldest">{{ $t('pages.admin.oldest') }}</option>
            <option value="name">{{ $t('pages.admin.byName') }}</option>
            <option value="activity">{{ $t('pages.admin.byActivity') }}</option></FormSelect
          >
          <IconButton
            v-if="search || roleFilter || accountFilter"
            icon="i-lucide-filter-x"
            :label="$t('pages.admin.clearFilters')"
            @click="clearFilters"
          />
        </div>

        <div
          v-if="selectedIds.length"
          class="admin-bulk surface-card"
        >
          <span>{{ $t('pages.admin.selected', { count: selectedIds.length }) }}</span
          ><FormSelect
            :model-value="null"
            :aria-label="$t('pages.admin.bulkRole')"
            :placeholder="$t('pages.admin.bulkRole')"
            @update:model-value="selectBulkRole"
            ><option
              v-for="role in roles"
              :key="role"
              :value="role"
            >
              {{ roleLabel(role) }}
            </option></FormSelect
          ><AppButton
            size="sm"
            icon="i-lucide-user-check"
            @click="pendingAction = { type: 'bulk-status', disabled: false }"
            >{{ $t('pages.admin.activate') }}</AppButton
          ><AppButton
            size="sm"
            variant="danger"
            icon="i-lucide-user-x"
            @click="pendingAction = { type: 'bulk-status', disabled: true }"
            >{{ $t('pages.admin.block') }}</AppButton
          ><IconButton
            icon="i-lucide-x"
            :label="$t('common.close')"
            @click="selectedIds = []"
          />
        </div>

        <div class="admin-table surface-card">
          <div class="admin-table__head">
            <FormCheckbox
              :model-value="allVisibleSelected"
              :aria-label="$t('pages.admin.selectAll')"
              @update:model-value="toggleVisible"
            /><span>{{ $t('pages.admin.account') }}</span
            ><span>{{ $t('pages.admin.role') }}</span
            ><span>{{ $t('pages.admin.workload') }}</span
            ><span>{{ $t('pages.admin.access') }}</span
            ><span />
          </div>
          <div
            v-for="account in filteredUsers"
            :key="account.id"
            class="admin-user"
          >
            <span class="admin-user__select"
              ><FormCheckbox
                :model-value="selectedIds.includes(account.id)"
                :aria-label="$t('pages.admin.selectUser', { name: account.name })"
                @update:model-value="toggleUser(account.id)"
            /></span>
            <button
              type="button"
              class="admin-user__identity"
              @click="selectedUser = account"
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
            <span
              class="admin-role"
              :class="`admin-role--${account.role}`"
              ><UIcon :name="roleIcon(account.role)" />{{ roleLabel(account.role) }}</span
            >
            <span class="admin-user__workload"
              ><strong>{{ account.taskDone }}/{{ account.taskTotal }}</strong
              ><small :class="{ 'text-[var(--color-danger)]': account.taskOverdue }">{{
                $t('pages.admin.overdueCount', { count: account.taskOverdue })
              }}</small></span
            >
            <span
              class="admin-status"
              :class="account.disabledAt ? 'admin-status--disabled' : 'admin-status--active'"
              ><i />{{ account.disabledAt ? $t('pages.admin.disabled') : $t('pages.admin.active') }}</span
            >
            <IconButton
              icon="i-lucide-chevron-right"
              :label="$t('pages.admin.viewProfile', { name: account.name })"
              size="sm"
              @click="selectedUser = account"
            />
          </div>
          <EmptyState
            v-if="!filteredUsers.length"
            :title="$t('pages.admin.noUsers')"
            :description="$t('pages.admin.noUsersHint')"
            icon="i-lucide-user-search"
          />
        </div>
      </section>

      <section
        v-else-if="activeTab === 'teams'"
        class="admin-teams"
      >
        <article
          v-for="team in data.teams"
          :key="team.id"
          class="admin-team surface-card"
        >
          <span class="admin-team__icon"><UIcon name="i-lucide-users-round" /></span>
          <div>
            <strong>{{ team.name }}</strong
            ><small>{{ $t('pages.admin.membersCount', { count: team.memberCount }) }}</small>
          </div>
          <FormSelect
            :model-value="team.managerId"
            :aria-label="$t('pages.admin.teamManager', { team: team.name })"
            @update:model-value="(id) => changeManager(team, String(id))"
            ><option
              v-for="manager in managerOptions"
              :key="manager.id"
              :value="manager.id"
            >
              {{ manager.name }} · {{ roleLabel(manager.role) }}
            </option></FormSelect
          >
        </article>
        <EmptyState
          v-if="!data.teams.length"
          :title="$t('pages.admin.noTeams')"
          :description="$t('pages.admin.noTeamsHint')"
          icon="i-lucide-users-round"
        />
      </section>

      <section
        v-else
        class="admin-audit surface-card"
      >
        <article
          v-for="entry in audit"
          :key="entry.id"
          class="admin-audit__entry"
        >
          <span class="admin-audit__icon"><UIcon name="i-lucide-shield-check" /></span>
          <div>
            <p>
              <strong>{{ entry.actor?.name ?? $t('pages.admin.unknownUser') }}</strong> {{ auditLabel(entry.action) }}
              <strong>{{ entry.target?.name ?? $t('pages.admin.unknownUser') }}</strong>
            </p>
            <small
              >{{ formatDate(entry.createdAt)
              }}<template v-if="entry.metadata.reason"> · {{ entry.metadata.reason }}</template></small
            >
          </div>
        </article>
        <EmptyState
          v-if="!audit?.length"
          :title="$t('pages.admin.noAudit')"
          :description="$t('pages.admin.noAuditHint')"
          icon="i-lucide-scroll-text"
        />
      </section>
    </template>

    <AppDrawer
      :open="Boolean(selectedUser)"
      :title="selectedUser?.name ?? ''"
      :eyebrow="$t('pages.admin.userProfile')"
      icon="i-lucide-user-round-cog"
      @close="selectedUser = null"
    >
      <template v-if="selectedUser">
        <section class="admin-profile__hero">
          <NuxtImg
            v-if="selectedUser.avatarUrl"
            :src="selectedUser.avatarUrl"
            :alt="selectedUser.name"
            width="64"
            height="64"
          /><span
            v-else
            class="admin-profile__avatar"
            >{{ selectedUser.name.slice(0, 1) }}</span
          >
          <div>
            <p>{{ selectedUser.email }}</p>
            <span
              class="admin-status"
              :class="selectedUser.disabledAt ? 'admin-status--disabled' : 'admin-status--active'"
              ><i />{{ selectedUser.disabledAt ? $t('pages.admin.disabled') : $t('pages.admin.active') }}</span
            >
          </div>
        </section>
        <section class="admin-profile__stats">
          <div>
            <span>{{ $t('pages.admin.tasks') }}</span
            ><strong>{{ selectedUser.taskTotal }}</strong>
          </div>
          <div>
            <span>{{ $t('pages.admin.projects') }}</span
            ><strong>{{ selectedUser.projectCount }}</strong>
          </div>
          <div>
            <span>{{ $t('pages.admin.teams') }}</span
            ><strong>{{ selectedUser.teamCount }}</strong>
          </div>
        </section>
        <section class="admin-profile__section">
          <h3>{{ $t('pages.admin.accountDetails') }}</h3>
          <dl>
            <div>
              <dt>{{ $t('pages.admin.registered') }}</dt>
              <dd>{{ formatDate(selectedUser.createdAt) }}</dd>
            </div>
            <div>
              <dt>{{ $t('pages.admin.lastActivity') }}</dt>
              <dd>{{ formatDate(selectedUser.lastActivityAt) }}</dd>
            </div>
            <div>
              <dt>{{ $t('pages.admin.completedTasks') }}</dt>
              <dd>{{ selectedUser.taskDone }}/{{ selectedUser.taskTotal }}</dd>
            </div>
          </dl>
        </section>
        <section class="admin-profile__section">
          <h3>{{ $t('pages.admin.permissions') }}</h3>
          <div class="admin-profile__roles">
            <button
              v-for="role in roles"
              :key="role"
              type="button"
              :class="{ 'admin-profile__role--active': selectedUser.role === role }"
              :disabled="selectedUser.id === user?.id && role !== 'admin'"
              @click="pendingAction = { type: 'role', account: selectedUser!, role }"
            >
              <UIcon :name="roleIcon(role)" />{{ roleLabel(role) }}
            </button>
          </div>
        </section>
      </template>
      <template #footer
        ><AppButton
          v-if="selectedUser"
          :variant="selectedUser.disabledAt ? 'secondary' : 'danger'"
          :icon="selectedUser.disabledAt ? 'i-lucide-user-check' : 'i-lucide-user-x'"
          :disabled="selectedUser.id === user?.id"
          block
          @click="pendingAction = { type: 'status', account: selectedUser!, disabled: !selectedUser!.disabledAt }"
          >{{ selectedUser.disabledAt ? $t('pages.admin.activate') : $t('pages.admin.block') }}</AppButton
        ></template
      >
    </AppDrawer>

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

<style scoped>
.admin-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
}
.admin-tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0.8rem 0;
  padding: 0.25rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
}
.admin-tabs__button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.55rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 650;
}
.admin-tabs__button span {
  padding: 0.05rem 0.35rem;
  border-radius: 99px;
  background: var(--color-bg-alt);
  font-size: 0.65rem;
}
.admin-tabs__button--active {
  background: var(--color-bg-alt);
  color: var(--text-primary);
}
.admin-toolbar {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) repeat(3, 9rem) auto;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  padding: 0.55rem;
}
.admin-toolbar__search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.7rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
}
.admin-toolbar__search input {
  width: 100%;
  height: 2.4rem;
  background: transparent;
  outline: none;
  font-size: 0.8rem;
}
.admin-bulk {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  padding: 0.55rem;
}
.admin-bulk > span {
  margin-right: auto;
  font-size: 0.8rem;
  font-weight: 650;
}
.admin-table {
  overflow: hidden;
  padding: 0;
}
.admin-table__head,
.admin-user {
  display: grid;
  grid-template-columns: 2rem minmax(13rem, 1.5fr) 8rem 7rem 7rem 1.5rem;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.8rem;
}
.admin-table__head {
  border-bottom: 1px solid var(--color-panel-border);
  background: var(--color-bg-alt);
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
}
.admin-user {
  width: 100%;
  border-bottom: 1px solid var(--color-panel-border);
  text-align: left;
}
.admin-user:hover {
  background: var(--color-bg-alt);
}
.admin-user__identity {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}
.admin-user__select {
  display: grid;
  place-items: center;
}
.admin-user__identity img,
.admin-user__avatar {
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  border-radius: 50%;
}
.admin-user__avatar,
.admin-profile__avatar {
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
  font-weight: 750;
}
.admin-user__identity > span:last-child {
  min-width: 0;
}
.admin-user__identity strong,
.admin-user__identity small,
.admin-user__workload strong,
.admin-user__workload small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.admin-user__identity strong,
.admin-user__workload strong {
  font-size: 0.78rem;
}
.admin-user__identity small,
.admin-user__workload small {
  color: var(--text-secondary);
  font-size: 0.66rem;
}
.admin-role,
.admin-status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  width: max-content;
  padding: 0.25rem 0.45rem;
  border-radius: 99px;
  background: var(--color-bg-alt);
  font-size: 0.67rem;
  font-weight: 650;
}
.admin-role--admin {
  color: #a78bfa;
}
.admin-role--pm {
  color: #60a5fa;
}
.admin-status i {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 50%;
}
.admin-status--active i {
  background: #22c55e;
}
.admin-status--disabled {
  color: var(--color-danger);
}
.admin-status--disabled i {
  background: var(--color-danger);
}
.admin-teams {
  display: grid;
  gap: 0.55rem;
}
.admin-team {
  display: grid;
  grid-template-columns: auto minmax(10rem, 1fr) minmax(12rem, 18rem);
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem;
}
.admin-team__icon,
.admin-audit__icon {
  display: grid;
  width: 2.3rem;
  height: 2.3rem;
  place-items: center;
  border-radius: 0.65rem;
  background: var(--color-bg-alt);
  color: var(--color-accent);
}
.admin-team strong,
.admin-team small {
  display: block;
}
.admin-team small {
  color: var(--text-secondary);
  font-size: 0.7rem;
}
.admin-audit {
  padding: 0.25rem 0.8rem;
}
.admin-audit__entry {
  display: flex;
  gap: 0.7rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-panel-border);
}
.admin-audit__entry > div {
  min-width: 0;
}
.admin-audit__entry p {
  font-size: 0.78rem;
}
.admin-audit__entry small {
  color: var(--text-secondary);
  font-size: 0.67rem;
}
.admin-profile__hero {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-panel-border);
}
.admin-profile__hero img,
.admin-profile__avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
}
.admin-profile__hero p {
  margin-bottom: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.admin-profile__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
}
.admin-profile__stats > div {
  padding: 0.7rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
}
.admin-profile__stats span,
.admin-profile__stats strong {
  display: block;
}
.admin-profile__stats span {
  color: var(--text-secondary);
  font-size: 0.65rem;
}
.admin-profile__section {
  padding: 1rem 0;
  border-top: 1px solid var(--color-panel-border);
}
.admin-profile__section h3 {
  margin-bottom: 0.65rem;
  font-weight: 700;
}
.admin-profile__section dl > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.35rem 0;
  font-size: 0.75rem;
}
.admin-profile__section dt {
  color: var(--text-secondary);
}
.admin-profile__roles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.admin-profile__roles button {
  display: grid;
  gap: 0.3rem;
  place-items: center;
  padding: 0.65rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
}
.admin-profile__role--active {
  border-color: var(--color-accent) !important;
  color: var(--color-accent) !important;
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
@media (max-width: 900px) {
  .admin-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .admin-table__head {
    display: none;
  }
  .admin-user {
    grid-template-areas:
      'select identity action'
      '. role status'
      '. workload workload';
    grid-template-columns: 1.5rem minmax(0, 1fr) auto;
    gap: 0.55rem 0.7rem;
    padding: 0.8rem;
  }
  .admin-user__select {
    grid-area: select;
  }
  .admin-user__identity {
    grid-area: identity;
  }
  .admin-role {
    grid-area: role;
  }
  .admin-user__workload {
    grid-area: workload;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .admin-status {
    grid-area: status;
  }
  .admin-user > .ui-icon-button {
    grid-area: action;
  }
  .admin-bulk {
    flex-wrap: wrap;
  }
  .admin-bulk > span {
    width: 100%;
  }
  .admin-team {
    grid-template-columns: auto 1fr;
  }
  .admin-team .form-select {
    grid-column: 1/-1;
  }
}
@media (max-width: 560px) {
  .admin-metrics {
    grid-template-columns: 1fr 1fr;
  }
  .admin-tabs__button {
    flex: 1;
    justify-content: center;
    padding: 0.5rem;
    font-size: 0;
  }
  .admin-tabs__button svg,
  .admin-tabs__button span {
    font-size: 0.7rem;
  }
  .admin-page__refresh,
  .admin-bulk .app-button {
    width: 2.35rem;
    padding-inline: 0;
    font-size: 0;
  }
  .admin-page__refresh :deep(svg),
  .admin-bulk .app-button :deep(svg) {
    width: 1rem;
    height: 1rem;
  }
  .admin-toolbar {
    grid-template-columns: 1fr;
  }
  .admin-bulk .form-select {
    min-width: 0;
    flex: 1;
  }
  .admin-user__identity small {
    max-width: 12rem;
  }
  .admin-profile__roles {
    grid-template-columns: 1fr;
  }
}
</style>
