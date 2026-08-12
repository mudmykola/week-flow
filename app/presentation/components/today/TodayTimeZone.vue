<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, UpdateTaskInput } from '~/domain/entities/task'
import type { DayTimeZone, TimeZoneKey } from '~/domain/services/daySchedule'

const props = defineProps<{
  zone: DayTimeZone
  zoneOptions: TimeZoneKey[]
  projects: Project[]
  assignees: AssignableUser[]
  variant?: 'standard' | 'tray' | 'warning'
}>()
const emit = defineEmits<{
  drop: [zone: DayTimeZone]
  drag: [id: string | null]
  edit: [task: Task]
  focus: [task: Task]
  patch: [task: Task, patch: UpdateTaskInput]
  moveZone: [task: Task, key: string]
}>()
const projectName = (id: string | null) => props.projects.find((item) => item.id === id)?.name
const assigneeName = (id: string | null) => props.assignees.find((item) => item.id === id)?.name
const auxiliary = computed(() => props.zone.key === 'outside' || props.zone.key === 'unscheduled')
</script>

<template>
  <section
    class="today-time-zone"
    :class="{
      'today-time-zone--over': zone.capacityMinutes && zone.plannedMinutes > zone.capacityMinutes,
      'today-time-zone--auxiliary': auxiliary,
      [`today-time-zone--${variant || 'standard'}`]: true,
      'today-time-zone--empty': !zone.tasks.length
    }"
    @dragover.prevent
    @drop="emit('drop', zone)"
  >
    <header>
      <div>
        <h2>
          <UIcon
            :name="
              zone.key === 'morning'
                ? 'i-lucide-sunrise'
                : zone.key === 'midday'
                  ? 'i-lucide-sun'
                  : zone.key === 'afternoon'
                    ? 'i-lucide-sunset'
                    : zone.key === 'outside'
                      ? 'i-lucide-moon-star'
                      : 'i-lucide-calendar-clock'
            "
          />{{ $t(`pages.today.timeZones.${zone.key}`) }}
        </h2>
        <p v-if="zone.start">{{ zone.start }}–{{ zone.end }}</p>
        <p v-else>{{ $t('pages.today.timeZones.dragHint') }}</p>
      </div>
      <span>{{ zone.tasks.length }}</span>
    </header>
    <div
      v-if="zone.capacityMinutes"
      class="today-time-zone__load"
    >
      <i
        ><b :style="{ width: `${Math.min(100, Math.round((zone.plannedMinutes / zone.capacityMinutes) * 100))}%` }"
      /></i>
      <small>{{ zone.plannedMinutes }} / {{ zone.capacityMinutes }} {{ $t('task.minuteShort') }}</small>
    </div>
    <BoundedTaskList
      :count="variant === 'tray' ? 0 : zone.tasks.length"
      :preview="auxiliary ? 3 : 4"
      :row-height="126"
      :storage-key="`today-zone-${zone.key}`"
    >
      <div class="today-time-zone__tasks">
        <div
          v-for="task in zone.tasks"
          :key="task.id"
          draggable="true"
          @dragstart="emit('drag', task.id)"
          @dragend="emit('drag', null)"
        >
          <TodayTimeTaskCard
            :task="task"
            :project-name="projectName(task.projectId)"
            :assignee-name="assigneeName(task.assigneeId)"
            :zone-key="zone.key"
            :zone-options="zoneOptions"
            @edit="emit('edit', task)"
            @focus="emit('focus', task)"
            @toggle="emit('patch', task, { status: task.status === 'done' ? 'todo' : 'done' })"
            @patch="emit('patch', task, $event)"
            @move-zone="emit('moveZone', task, $event)"
          />
        </div>
        <p
          v-if="!zone.tasks.length"
          class="today-time-zone__empty"
        >
          {{ $t('pages.today.timeZones.empty') }}
        </p>
      </div>
    </BoundedTaskList>
  </section>
</template>

<style scoped>
.today-time-zone {
  min-height: 13rem;
  padding: 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 1rem;
  background: var(--color-panel-bg);
}
.today-time-zone--over {
  border-color: var(--color-danger);
}
.today-time-zone--auxiliary {
  min-height: 0;
}
.today-time-zone--tray {
  min-height: 0;
  border-style: dashed;
  background: color-mix(in srgb, var(--color-panel-bg) 78%, transparent);
}
.today-time-zone--tray .today-time-zone__tasks {
  display: flex;
  min-height: 0;
  gap: 0.55rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 0.65rem 0 0.15rem;
  scroll-snap-type: x proximity;
}
.today-time-zone--tray .today-time-zone__tasks > div {
  width: min(19rem, 82vw);
  flex: none;
  scroll-snap-align: start;
}
.today-time-zone--warning {
  min-height: 0;
  border-color: color-mix(in srgb, #f59e0b 45%, var(--color-panel-border));
  background: color-mix(in srgb, #f59e0b 5%, var(--color-panel-bg));
}
.today-time-zone > header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.today-time-zone h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 750;
}
.today-time-zone header p,
.today-time-zone header span,
.today-time-zone__load small {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.today-time-zone__load {
  margin: 0.65rem 0;
}
.today-time-zone__load i {
  display: block;
  height: 4px;
  margin-bottom: 0.25rem;
  overflow: hidden;
  border-radius: 99px;
  background: var(--color-bg-alt);
}
.today-time-zone__load b {
  display: block;
  height: 100%;
  background: var(--color-accent);
}
.today-time-zone__tasks {
  display: grid;
  gap: 0.45rem;
  min-height: 10rem;
}
.today-time-zone--auxiliary .today-time-zone__tasks {
  min-height: 0;
  margin-top: 0.6rem;
}
.today-time-zone--empty.today-time-zone--auxiliary .today-time-zone__tasks {
  min-height: 3.25rem;
}
.today-time-zone__empty {
  align-self: center;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-align: center;
}
@media (max-width: 700px) {
  .today-time-zone {
    min-height: 0;
  }
  .today-time-zone__tasks {
    min-height: 4rem;
  }
}
</style>
