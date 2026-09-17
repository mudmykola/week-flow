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

<style scoped src="~/presentation/assets/css/components/today/today-time-zone.css"></style>
