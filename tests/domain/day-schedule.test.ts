import { describe, expect, it } from 'vitest'
import { autoPlanDay, buildDayTimeZones, nextZoneTime } from '~/domain/services/daySchedule'
import { defaultDaySchedule } from '#shared/types/daySchedule'
import { makeTask } from '../fixtures'

describe('Today time-zone planning', () => {
  it('groups tasks and subtracts a floating lunch from zone capacity', () => {
    const zones = buildDayTimeZones(
      [
        makeTask({ id: 'morning', plannedDate: '2026-08-12', plannedTime: '10:00', estimateMinutes: 60 }),
        makeTask({ id: 'midday', plannedDate: '2026-08-12', plannedTime: '12:30', estimateMinutes: 30 }),
        makeTask({ id: 'late', plannedDate: '2026-08-12', plannedTime: '20:00' }),
        makeTask({ id: 'free', plannedDate: '2026-08-12', plannedTime: null })
      ],
      '2026-08-12',
      defaultDaySchedule
    )
    expect(zones.map((zone) => [zone.key, zone.tasks.map((task) => task.id)])).toEqual([
      ['morning', ['morning']],
      ['midday', ['midday']],
      ['afternoon', []],
      ['outside', ['late']],
      ['unscheduled', ['free']]
    ])
    expect(zones.find((zone) => zone.key === 'midday')?.capacityMinutes).toBe(120)
  })

  it('auto-plans Top 3 and priority while skipping lunch', () => {
    const schedule = { ...defaultDaySchedule, workStart: '12:00', lunchStart: '13:00' }
    const result = autoPlanDay(
      [
        makeTask({ id: 'normal', plannedDate: '2026-08-12', estimateMinutes: 45, priority: 'low' }),
        makeTask({ id: 'top', plannedDate: '2026-08-12', estimateMinutes: 45, dayRank: 1 })
      ],
      '2026-08-12',
      schedule
    )
    expect(result).toEqual([
      { id: 'top', plannedTime: '12:00' },
      { id: 'normal', plannedTime: '14:00' }
    ])
  })

  it('suggests the next free time and keeps overflow unscheduled', () => {
    const [morning] = buildDayTimeZones(
      [makeTask({ plannedDate: '2026-08-12', plannedTime: '09:00', estimateMinutes: 60 })],
      '2026-08-12',
      defaultDaySchedule
    )
    expect(nextZoneTime(morning!, defaultDaySchedule)).toBe('10:00')
    expect(
      autoPlanDay(
        [makeTask({ id: 'huge', plannedDate: '2026-08-12', estimateMinutes: 600 })],
        '2026-08-12',
        defaultDaySchedule
      )
    ).toEqual([{ id: 'huge', plannedTime: null }])
  })
})
