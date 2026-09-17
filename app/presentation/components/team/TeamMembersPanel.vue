<script setup lang="ts">
import type { TeamMemberSummary } from '~/domain/entities/team'

defineProps<{ teamName: string; members: TeamMemberSummary[]; currentUserId?: string; email: string }>()
defineEmits<{
  'update:email': [value: string]
  add: []
  remove: [id: string]
}>()
</script>

<template>
  <article class="team-members-panel section-card">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="font-display">{{ teamName }}</h2>
        <p class="text-secondary text-xs">{{ $t('pages.team.memberProgress') }}</p>
      </div>
      <form
        class="flex gap-2"
        @submit.prevent="$emit('add')"
      >
        <input
          :value="email"
          type="email"
          class="h-9 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 text-sm"
          :placeholder="$t('pages.team.memberEmail')"
          @input="$emit('update:email', ($event.target as HTMLInputElement).value)"
        /><UButton
          size="sm"
          type="submit"
          icon="i-lucide-user-plus"
          >{{ $t('common.add') }}</UButton
        >
      </form>
    </div>
    <div class="divide-y divide-[var(--color-panel-border)]">
      <div
        v-for="member in members"
        :key="member.id"
        class="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_6rem_auto]"
      >
        <div class="flex min-w-0 items-center gap-2">
          <NuxtImg
            v-if="member.avatarUrl"
            :src="member.avatarUrl"
            width="32"
            height="32"
            class="size-8 rounded-full"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ member.name }}</p>
            <p class="text-secondary truncate text-xs">{{ member.email }}</p>
          </div>
        </div>
        <div>
          <p class="text-secondary text-xs">{{ $t('pages.review.completed') }}</p>
          <p class="text-sm font-semibold">{{ member.taskDone }}/{{ member.taskTotal }}</p>
        </div>
        <div>
          <p class="text-secondary text-xs">{{ $t('pages.team.working') }}</p>
          <p class="text-sm font-semibold">{{ member.taskActive }}</p>
        </div>
        <div>
          <p class="text-secondary text-xs">{{ $t('nav.overdue') }}</p>
          <p
            class="text-sm font-semibold"
            :class="member.taskOverdue ? 'text-[var(--color-danger)]' : ''"
          >
            {{ member.taskOverdue }}
          </p>
        </div>
        <IconButton
          v-if="member.id !== currentUserId"
          icon="i-lucide-user-minus"
          :label="$t('pages.team.remove')"
          variant="ghost"
          @click="$emit('remove', member.id)"
        />
      </div>
    </div>
  </article>
</template>
