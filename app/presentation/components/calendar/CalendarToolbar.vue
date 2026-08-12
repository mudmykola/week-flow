<script setup lang="ts">
import type { CalendarView } from '~/application/composables/useCalendarCursor'

defineProps<{ title: string; total: number }>()
const emit = defineEmits<{ previous: []; next: []; today: [] }>()
const view = defineModel<CalendarView>('view', { required: true })
</script>

<template>
  <section class="calendar-toolbar surface-card">
    <div class="calendar-toolbar__navigation">
      <IconButton
        icon="i-lucide-chevron-left"
        :label="$t('pages.calendar.previous')"
        @click="emit('previous')"
      />
      <div class="calendar-toolbar__period">
        <strong>{{ title }}</strong
        ><span>{{ total }} {{ $t('pages.calendar.tasks') }}</span>
      </div>
      <IconButton
        icon="i-lucide-chevron-right"
        :label="$t('pages.calendar.next')"
        @click="emit('next')"
      />
      <AppButton
        size="sm"
        icon="i-lucide-locate-fixed"
        @click="emit('today')"
        >{{ $t('pages.calendar.today') }}</AppButton
      >
    </div>
    <div
      class="calendar-workspace__views"
      role="group"
      :aria-label="$t('pages.calendar.view')"
    >
      <button
        v-for="option in ['month', 'week', 'agenda'] as CalendarView[]"
        :key="option"
        :class="{ 'is-active': view === option }"
        @click="view = option"
      >
        <UIcon
          :name="
            option === 'month'
              ? 'i-lucide-calendar-range'
              : option === 'week'
                ? 'i-lucide-calendar-clock'
                : 'i-lucide-list'
          "
        />
        <span>{{ $t(`pages.calendar.${option}`) }}</span>
      </button>
    </div>
  </section>
</template>
