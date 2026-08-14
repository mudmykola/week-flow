<script setup lang="ts">
defineProps<{ available: string[] }>()
const emit = defineEmits<{ add: [tag: string] }>()
const tags = defineModel<string[]>({ required: true })
const draft = ref('')

function add() {
  const value = draft.value.trim()
  if (!value) return
  emit('add', value)
  draft.value = ''
}
</script>

<template>
  <section class="task-tags-editor rounded-2xl border border-[var(--color-panel-border)] p-4">
    <h3 class="task-tags-editor__title mb-3 flex items-center gap-2 text-sm font-semibold">
      <UIcon name="i-lucide-tags" />{{ $t('task.tags') }}
    </h3>
    <div class="task-tags-editor__selected flex flex-wrap gap-1.5">
      <AppButton
        v-for="tag in tags"
        :key="tag"
        variant="ghost"
        size="sm"
        icon="i-lucide-x"
        :aria-label="$t('task.removeTag', { tag })"
        @click="tags = tags.filter((item) => item !== tag)"
      >
        #{{ tag }}
      </AppButton>
    </div>
    <FormInput
      v-model="draft"
      class="mt-2"
      :placeholder="$t('task.tagsPlaceholder')"
      @keyup.enter="add"
    />
    <div
      v-if="available.length"
      class="task-tags-editor__suggestions mt-2 flex flex-wrap gap-1.5"
    >
      <AppButton
        v-for="tag in available"
        :key="tag"
        variant="ghost"
        size="sm"
        icon="i-lucide-plus"
        @click="emit('add', tag)"
      >
        {{ tag }}
      </AppButton>
    </div>
  </section>
</template>
