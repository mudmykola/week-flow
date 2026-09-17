<script setup lang="ts">
import type { AdminAuditEntry } from '~/domain/entities/admin'

defineProps<{
  entries: AdminAuditEntry[]
  formatDate: (value: number | null) => string
  label: (action: string) => string
}>()
</script>

<template>
  <section class="admin-audit-panel admin-audit surface-card">
    <article
      v-for="entry in entries"
      :key="entry.id"
      class="admin-audit__entry"
    >
      <span class="admin-audit__icon"><UIcon name="i-lucide-shield-check" /></span>
      <div>
        <p>
          <strong>{{ entry.actor?.name ?? $t('pages.admin.unknownUser') }}</strong> {{ label(entry.action) }}
          <strong>{{ entry.target?.name ?? $t('pages.admin.unknownUser') }}</strong>
        </p>
        <small
          >{{ formatDate(entry.createdAt)
          }}<template v-if="entry.metadata.reason"> · {{ entry.metadata.reason }}</template></small
        >
      </div>
    </article>
    <EmptyState
      v-if="!entries.length"
      :title="$t('pages.admin.noAudit')"
      :description="$t('pages.admin.noAuditHint')"
      icon="i-lucide-scroll-text"
    />
  </section>
</template>
