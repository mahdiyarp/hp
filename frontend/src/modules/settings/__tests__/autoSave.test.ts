import { describe, expect, it, vi } from 'vitest'

import {
  AUTO_SAVE_RESET_DELAY_MS,
  DEFAULT_AUTO_SAVE_DELAY_MS,
  describeAutoSaveState,
  scheduleAutoSaveIdleReset,
} from '../autoSave'

describe('autoSave helper', () => {
  it('exposes the shared debounce delay', () => {
    expect(DEFAULT_AUTO_SAVE_DELAY_MS).toBe(700)
  })

  it('returns default labels for every state', () => {
    expect(describeAutoSaveState('idle')).toContain('ذخیره خودکار')
    expect(describeAutoSaveState('pending')).toBe('در صف ذخیره')
    expect(describeAutoSaveState('saving')).toBe('در حال ذخیره…')
    expect(describeAutoSaveState('saved')).toBe('ذخیره شد')
    expect(describeAutoSaveState('error')).toBe('خطا در ذخیره')
  })

  it('allows overriding labels and forcing saving state', () => {
    const labels = { saved: 'done', saving: 'saving-now' }
    expect(describeAutoSaveState('saved', { labels })).toBe('done')
    expect(describeAutoSaveState('idle', { labels, forceSaving: true })).toBe('saving-now')
  })

  it('exposes the shared idle reset delay', () => {
    expect(AUTO_SAVE_RESET_DELAY_MS).toBe(2500)
  })

  it('schedules idle resets through the helper', () => {
    vi.useFakeTimers()
    const setter = vi.fn()
    const timer = scheduleAutoSaveIdleReset(setter, 125)
    expect(timer).toBeTruthy()
    vi.advanceTimersByTime(120)
    expect(setter).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5)
    expect(setter).toHaveBeenCalledWith('idle')
    vi.useRealTimers()
  })
})
