<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, UpdateTaskInput } from '~/domain/entities/task'
import { buildDayTimeZones, nextZoneTime } from '~/domain/services/daySchedule'
import type { DaySchedule } from '#shared/types/daySchedule'

const props = defineProps<{
  tasks: Task[]
  date: string
  schedule: DaySchedule
  projects: Project[]
  assignees: AssignableUser[]
  saving?: boolean
}>()
const emit = defineEmits<{
  move: [task: Task, plannedTime: string | null]
  patch: [task: Task, patch: UpdateTaskInput]
  edit: [task: Task]
  focus: [task: Task]
  autoPlan: []
  saveSchedule: [schedule: DaySchedule]
}>()
const draft = reactive<DaySchedule>({ ...props.schedule })
watch(
  () => props.schedule,
  (value) => Object.assign(draft, value),
  { deep: true }
)
const zones = computed(() => buildDayTimeZones(props.tasks, props.date, draft))
const workZones = computed(() => zones.value.filter((zone) => !['outside', 'unscheduled'].includes(zone.key)))
const unscheduledZone = computed(() => zones.value.find((zone) => zone.key === 'unscheduled')!)
const outsideZone = computed(() => zones.value.find((zone) => zone.key === 'outside')!)
const draggedId = ref<string | null>(null)
const totalCapacity = computed(() => zones.value.reduce((sum, zone) => sum + zone.capacityMinutes, 0))
const totalPlanned = computed(() => zones.value.reduce((sum, zone) => sum + zone.plannedMinutes, 0))
function forwardPatch(task: Task, patch: UpdateTaskInput) {
  emit('patch', task, patch)
}
function drop(zone: (typeof zones.value)[number]) {
  const task = props.tasks.find((item) => item.id === draggedId.value)
  if (task && zone.key !== 'outside') emit('move', task, zone.key === 'unscheduled' ? null : nextZoneTime(zone, draft))
  draggedId.value = null
}
function moveToZone(task: Task, key: string) {
  const zone = zones.value.find((item) => item.key === key)
  if (zone && zone.key !== 'outside') emit('move', task, zone.key === 'unscheduled' ? null : nextZoneTime(zone, draft))
}
</script>

<template>
  <section class="today-time-planner">
    <header class="today-time-planner__header surface-card">
      <div>
        <p class="text-secondary text-xs">{{ $t('pages.today.timeZones.capacity') }}</p>
        <strong>{{ totalPlanned }} / {{ totalCapacity }} {{ $t('task.minuteShort') }}</strong>
      </div>
      <div class="today-time-planner__lunch">
        <UIcon name="i-lucide-utensils" /><span>{{ $t('pages.today.timeZones.lunch') }}</span
        ><FormInput
          v-model="draft.lunchStart"
          type="time"
        /><FormSelect v-model="draft.lunchMinutes"
          ><option :value="30">30 {{ $t('task.minuteShort') }}</option>
          <option :value="45">45 {{ $t('task.minuteShort') }}</option>
          <option :value="60">60 {{ $t('task.minuteShort') }}</option>
          <option :value="90">90 {{ $t('task.minuteShort') }}</option></FormSelect
        >
      </div>
      <AppButton
        size="sm"
        variant="secondary"
        icon="i-lucide-wand-sparkles"
        :disabled="saving"
        @click="emit('autoPlan')"
        >{{ $t('pages.today.timeZones.autoPlan') }}</AppButton
      >
      <AppButton
        size="sm"
        icon="i-lucide-save"
        :disabled="saving"
        @click="emit('saveSchedule', { ...draft })"
        >{{ $t('common.save') }}</AppButton
      >
    </header>
    <details class="today-time-planner__settings surface-card">
      <summary><UIcon name="i-lucide-sliders-horizontal" />{{ $t('pages.today.timeZones.configure') }}</summary>
      <div class="today-time-planner__settings-grid">
        <FormField :label="$t('pages.today.timeZones.workStart')"
          ><FormInput
            v-model="draft.workStart"
            type="time"
        /></FormField>
        <FormField :label="$t('pages.today.timeZones.morningEnd')"
          ><FormInput
            v-model="draft.morningEnd"
            type="time"
        /></FormField>
        <FormField :label="$t('pages.today.timeZones.middayEnd')"
          ><FormInput
            v-model="draft.middayEnd"
            type="time"
        /></FormField>
        <FormField :label="$t('pages.today.timeZones.workEnd')"
          ><FormInput
            v-model="draft.workEnd"
            type="time"
        /></FormField>
      </div>
    </details>
    <TodayTimeZone
      :zone="unscheduledZone"
      :zone-options="zones.map((item) => item.key)"
      :projects="projects"
      :assignees="assignees"
      variant="tray"
      @drop="drop"
      @drag="draggedId = $event"
      @edit="emit('edit', $event)"
      @focus="emit('focus', $event)"
      @patch="forwardPatch"
      @move-zone="moveToZone"
    />
    <div class="today-time-planner__board">
      <div class="today-time-planner__work-zones">
        <TodayTimeZone
          v-for="zone in workZones"
          :key="zone.key"
          :zone="zone"
          :zone-options="zones.map((item) => item.key)"
          :projects="projects"
          :assignees="assignees"
          @drop="drop"
          @drag="draggedId = $event"
          @edit="emit('edit', $event)"
          @focus="emit('focus', $event)"
          @patch="forwardPatch"
          @move-zone="moveToZone"
        />
      </div>
    </div>
    <TodayTimeZone
      v-if="outsideZone.tasks.length"
      :zone="outsideZone"
      :zone-options="zones.map((item) => item.key)"
      :projects="projects"
      :assignees="assignees"
      variant="warning"
      @drop="drop"
      @drag="draggedId = $event"
      @edit="emit('edit', $event)"
      @focus="emit('focus', $event)"
      @patch="forwardPatch"
      @move-zone="moveToZone"
    />
  </section>
</template>

<style scoped>
.today-time-planner {
  display: grid;
  gap: 0.75rem;
}
.today-time-planner__header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem;
}
.today-time-planner__header > div:first-child {
  margin-right: auto;
}
.today-time-planner__lunch {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.today-time-planner__lunch .form-input,
.today-time-planner__lunch .form-select {
  width: 7rem;
}
.today-time-planner__settings {
  padding: 0.7rem 0.85rem;
}
.today-time-planner__settings summary {
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 650;
}
.today-time-planner__settings-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
  margin-top: 0.75rem;
}
.today-time-planner__board {
  padding-bottom: 0.5rem;
}
.today-time-planner__work-zones {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 0.75rem;
}
@media (max-width: 1180px) {
  .today-time-planner__work-zones {
    grid-template-columns: repeat(3, minmax(15rem, 1fr));
    overflow-x: auto;
    padding-bottom: 0.35rem;
  }
}
@media (max-width: 700px) {
  .today-time-planner__header {
    align-items: stretch;
    flex-direction: column;
  }
  .today-time-planner__header > div:first-child {
    margin-right: 0;
  }
  .today-time-planner__lunch {
    flex-wrap: wrap;
  }
  .today-time-planner__settings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .today-time-planner__work-zones {
    grid-template-columns: 1fr;
  }
}
</style>
