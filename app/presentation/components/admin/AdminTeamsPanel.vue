<script setup lang="ts">
import type { AdminTeam, AdminUser } from '~/domain/entities/admin'

defineProps<{ teams: AdminTeam[]; managers: AdminUser[] }>()
defineEmits<{ changeManager: [team: AdminTeam, managerId: string] }>()
const { t } = useI18n()
const roleLabel = (role: AdminUser['role']) => t(`pages.admin.${role}`)
</script>

<template>
  <section class="admin-teams-panel admin-teams">
    <article
      v-for="team in teams"
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
        @update:model-value="$emit('changeManager', team, String($event))"
        ><option
          v-for="manager in managers"
          :key="manager.id"
          :value="manager.id"
        >
          {{ manager.name }} · {{ roleLabel(manager.role) }}
        </option></FormSelect
      >
    </article>
    <EmptyState
      v-if="!teams.length"
      :title="$t('pages.admin.noTeams')"
      :description="$t('pages.admin.noTeamsHint')"
      icon="i-lucide-users-round"
    />
  </section>
</template>
