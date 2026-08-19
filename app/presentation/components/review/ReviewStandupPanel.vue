<script setup lang="ts">
defineProps<{
  standup: string
  content: string
  saving: 'idle' | 'saving' | 'saved' | 'error'
  copied: boolean
  canEdit: boolean
}>()
const emit = defineEmits<{ copy: []; regenerate: []; finish: []; 'update:content': [value: string] }>()
const editing = ref(false)
</script>

<template>
  <aside class="review-standup-panel surface-card">
    <header>
      <div>
        <span>{{ $t('pages.review.v2.readyStandup') }}</span
        ><small :class="`is-${saving}`">{{ $t(`pages.review.v2.save.${saving}`) }}</small>
      </div>
      <IconButton
        icon="i-lucide-copy"
        :label="$t('pages.review.v2.copyStandup')"
        @click="emit('copy')"
      />
    </header>
    <pre v-if="!editing">{{ standup }}</pre>
    <FormTextarea
      v-else
      :model-value="content"
      rows="14"
      @update:model-value="emit('update:content', $event ?? '')"
    />
    <footer>
      <AppButton
        v-if="canEdit"
        size="sm"
        variant="ghost"
        :icon="editing ? 'i-lucide-eye' : 'i-lucide-pencil'"
        @click="editing = !editing"
        >{{ editing ? $t('pages.review.v2.preview') : $t('common.edit') }}</AppButton
      >
      <AppButton
        v-if="canEdit && editing"
        size="sm"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        @click="emit('regenerate')"
        >{{ $t('pages.review.v2.regenerate') }}</AppButton
      >
      <AppButton
        v-if="canEdit"
        size="sm"
        icon="i-lucide-check"
        @click="emit('finish')"
        >{{ $t('pages.review.v2.finish') }}</AppButton
      >
      <SemanticBadge
        v-if="copied"
        tone="success"
        icon="i-lucide-check"
        >{{ $t('pages.review.v2.copied') }}</SemanticBadge
      >
    </footer>
  </aside>
</template>

<style scoped>
.review-standup-panel {
  position: sticky;
  top: 1rem;
  align-self: start;
  padding: 0.8rem;
}
.review-standup-panel header,
.review-standup-panel footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.review-standup-panel header {
  justify-content: space-between;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--color-panel-border);
}
.review-standup-panel header span,
.review-standup-panel header small {
  display: block;
}
.review-standup-panel header span {
  font-size: 0.82rem;
  font-weight: 800;
}
.review-standup-panel header small {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}
.review-standup-panel header small.is-error {
  color: var(--color-danger);
}
.review-standup-panel pre {
  max-height: 30rem;
  margin: 0.7rem 0;
  overflow: auto;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 0.73rem;
  line-height: 1.55;
}
.review-standup-panel footer {
  flex-wrap: wrap;
  padding-top: 0.65rem;
  border-top: 1px solid var(--color-panel-border);
}
</style>
