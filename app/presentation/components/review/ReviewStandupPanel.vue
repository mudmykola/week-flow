<script setup lang="ts">
const props = defineProps<{
  standup: string
  content: string
  saving: 'idle' | 'saving' | 'saved' | 'error'
  copied: boolean
  canEdit: boolean
  completed: boolean
}>()
const emit = defineEmits<{ copy: []; regenerate: []; finish: []; reopen: []; 'update:content': [value: string] }>()
const editing = ref(false)
function toggleCompletion() {
  if (props.completed) emit('reopen')
  else emit('finish')
}
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
        :variant="completed ? 'ghost' : 'primary'"
        :icon="completed ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
        @click="toggleCompletion"
        >{{ completed ? $t('pages.review.final.reopen') : $t('pages.review.final.closeDay') }}</AppButton
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

<style scoped src="~/presentation/assets/css/components/review/review-standup-panel.css"></style>
