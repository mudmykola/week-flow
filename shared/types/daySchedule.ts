export interface DaySchedule {
  workStart: string
  morningEnd: string
  middayEnd: string
  workEnd: string
  lunchStart: string
  lunchMinutes: number
}

export const defaultDaySchedule: DaySchedule = {
  workStart: '09:00',
  morningEnd: '12:00',
  middayEnd: '15:00',
  workEnd: '18:00',
  lunchStart: '13:00',
  lunchMinutes: 60
}
