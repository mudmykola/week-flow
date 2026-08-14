// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { processDueReminders } from '../../server/utils/reminderEngine'

describe('reminder engine', () => {
  it('creates due deliveries idempotently and reports inserted rows', async () => {
    const run = vi.fn().mockResolvedValue({ meta: { changes: 2 } })
    const bind = vi.fn().mockReturnValue({ run })
    const prepare = vi.fn().mockReturnValue({ bind })
    await expect(processDueReminders({ prepare } as never, 1234)).resolves.toBe(2)
    expect(prepare.mock.calls[0]?.[0]).toContain('INSERT OR IGNORE INTO reminder_deliveries')
    expect(prepare.mock.calls[0]?.[0]).toContain("tasks.status <> 'done'")
    expect(bind).toHaveBeenCalledWith(1234, 1234)
  })
})
