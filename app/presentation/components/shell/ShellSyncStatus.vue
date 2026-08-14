<script setup lang="ts">
const queue = useOfflineMutationQueue()
</script>

<template>
  <UPopover
    v-if="queue.pending.value || queue.syncing.value || queue.conflict.value"
    class="shell-sync-status"
  >
    <button
      class="shell-sync-status__trigger inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600"
      :aria-label="$t('sync.title')"
    >
      <UIcon
        :name="
          queue.syncing.value
            ? 'i-lucide-refresh-cw'
            : queue.conflict.value
              ? 'i-lucide-triangle-alert'
              : 'i-lucide-cloud-upload'
        "
        :class="{ 'animate-spin': queue.syncing.value }"
      />
      <span class="hidden sm:inline">{{
        queue.syncing.value ? $t('sync.syncing') : $t('sync.pending', { count: queue.pending.value })
      }}</span>
    </button>
    <template #content>
      <div class="shell-sync-status__panel w-72 space-y-2 p-3 text-sm">
        <strong>{{ $t('sync.title') }}</strong>
        <p class="text-secondary text-xs">
          {{ queue.conflict.value ? $t('sync.conflictHint') : $t('sync.pendingHint', { count: queue.pending.value }) }}
        </p>
        <div class="flex gap-2">
          <AppButton
            size="sm"
            :disabled="queue.syncing.value"
            @click="queue.flush"
            >{{ $t('common.tryAgain') }}</AppButton
          >
          <AppButton
            v-if="queue.conflict.value"
            size="sm"
            variant="danger"
            @click="queue.discardConflict"
            >{{ $t('sync.discard') }}</AppButton
          >
        </div>
      </div>
    </template>
  </UPopover>
</template>
