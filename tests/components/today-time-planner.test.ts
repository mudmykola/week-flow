import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Today Time Zones UI contract', () => {
  it('connects configurable zones, floating lunch and automatic planning', () => {
    const workspace = read('app/presentation/components/today/TodayWorkspace.vue')
    const planner = read('app/presentation/components/today/TodayTimePlanner.vue')
    const zone = read('app/presentation/components/today/TodayTimeZone.vue')
    expect(workspace).toContain('<TodayTimePlanner')
    expect(workspace).toContain('autoPlanDay')
    expect(workspace).toContain('const tasksStore = useTasksStore()')
    expect(workspace).toContain('tasksStore.syncListTask(task)')
    expect(planner).toContain('const workZones = computed')
    expect(planner).toContain('const unscheduledZone = computed')
    expect(planner).toContain('const outsideZone = computed')
    expect(planner).toContain('today-time-planner__work-zones')
    expect(planner).toContain('variant="tray"')
    expect(planner).toContain('variant="warning"')
    expect(zone).toContain('today-time-zone--tray .today-time-zone__tasks')
    expect(planner).toContain('<TodayTimeZone')
    expect(workspace).toContain("$fetch('/api/settings', { method: 'PATCH'")
    expect(planner).toContain('v-model="draft.lunchStart"')
    expect(zone).toContain('@dragover.prevent')
    expect(zone).toContain('@drop="emit(\'drop\', zone)"')
    expect(zone).toContain('today-time-zone--over')
    expect(zone).toContain('<TodayTimeTaskCard')
    expect(planner).not.toContain('<TodayTaskRow')
    expect(zone).toContain("zone.key === 'outside'")
  })
})
