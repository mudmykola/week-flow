<script setup lang="ts">
import type { AdminPendingAction, AdminRole, AdminUser } from '~/domain/entities/admin'

defineProps<{
  account: AdminUser | null
  currentUserId?: string
  roles: AdminRole[]
  formatDate: (value: number | null) => string
}>()
defineEmits<{ close: []; action: [value: Exclude<AdminPendingAction, null>] }>()
const { t } = useI18n()
const roleLabel = (role: AdminRole) => t(`pages.admin.${role}`)
const roleIcon = (role: AdminRole) =>
  role === 'admin' ? 'i-lucide-shield-check' : role === 'pm' ? 'i-lucide-briefcase-business' : 'i-lucide-user'
</script>

<template>
  <AppDrawer
    class="admin-user-drawer"
    :open="Boolean(account)"
    :title="account?.name ?? ''"
    :eyebrow="$t('pages.admin.userProfile')"
    icon="i-lucide-user-round-cog"
    @close="$emit('close')"
  >
    <template v-if="account">
      <section class="admin-profile__hero">
        <NuxtImg
          v-if="account.avatarUrl"
          :src="account.avatarUrl"
          :alt="account.name"
          width="64"
          height="64"
        /><span
          v-else
          class="admin-profile__avatar"
          >{{ account.name.slice(0, 1) }}</span
        >
        <div>
          <p>{{ account.email }}</p>
          <span
            class="admin-status"
            :class="account.disabledAt ? 'admin-status--disabled' : 'admin-status--active'"
            ><i />{{ account.disabledAt ? $t('pages.admin.disabled') : $t('pages.admin.active') }}</span
          >
        </div>
      </section>
      <section class="admin-profile__stats">
        <div>
          <span>{{ $t('pages.admin.tasks') }}</span
          ><strong>{{ account.taskTotal }}</strong>
        </div>
        <div>
          <span>{{ $t('pages.admin.projects') }}</span
          ><strong>{{ account.projectCount }}</strong>
        </div>
        <div>
          <span>{{ $t('pages.admin.teams') }}</span
          ><strong>{{ account.teamCount }}</strong>
        </div>
      </section>
      <section class="admin-profile__section">
        <h3>{{ $t('pages.admin.accountDetails') }}</h3>
        <dl>
          <div>
            <dt>{{ $t('pages.admin.registered') }}</dt>
            <dd>{{ formatDate(account.createdAt) }}</dd>
          </div>
          <div>
            <dt>{{ $t('pages.admin.lastActivity') }}</dt>
            <dd>{{ formatDate(account.lastActivityAt) }}</dd>
          </div>
          <div>
            <dt>{{ $t('pages.admin.completedTasks') }}</dt>
            <dd>{{ account.taskDone }}/{{ account.taskTotal }}</dd>
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
            :class="{ 'admin-profile__role--active': account.role === role }"
            :disabled="account.id === currentUserId && role !== 'admin'"
            @click="$emit('action', { type: 'role', account, role })"
          >
            <UIcon :name="roleIcon(role)" />{{ roleLabel(role) }}
          </button>
        </div>
      </section>
    </template>
    <template #footer>
      <AppButton
        v-if="account"
        :variant="account.disabledAt ? 'secondary' : 'danger'"
        :icon="account.disabledAt ? 'i-lucide-user-check' : 'i-lucide-user-x'"
        :disabled="account.id === currentUserId"
        block
        @click="$emit('action', { type: 'status', account, disabled: !account.disabledAt })"
      >
        {{ account.disabledAt ? $t('pages.admin.activate') : $t('pages.admin.block') }}
      </AppButton>
    </template>
  </AppDrawer>
</template>
