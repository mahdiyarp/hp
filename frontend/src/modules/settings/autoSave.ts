export type AutoSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export const DEFAULT_AUTO_SAVE_DELAY_MS = 700
export const AUTO_SAVE_RESET_DELAY_MS = 2500

const DEFAULT_LABELS: Record<AutoSaveState, string> = {
  idle: 'ذخیره خودکار فعال است',
  pending: 'در صف ذخیره',
  saving: 'در حال ذخیره…',
  saved: 'ذخیره شد',
  error: 'خطا در ذخیره',
}

interface DescribeOptions {
  forceSaving?: boolean
  labels?: Partial<Record<AutoSaveState, string>>
}

export function describeAutoSaveState(
  state: AutoSaveState,
  options?: DescribeOptions,
): string {
  const labels = options?.labels ? { ...DEFAULT_LABELS, ...options.labels } : DEFAULT_LABELS
  if (options?.forceSaving) return labels.saving
  return labels[state] ?? DEFAULT_LABELS.idle
}

export function scheduleAutoSaveIdleReset(
  setState: (next: AutoSaveState) => void,
  delay = AUTO_SAVE_RESET_DELAY_MS,
): number {
  return window.setTimeout(() => setState('idle'), delay)
}
