type ToastType = 'success' | 'error' | 'info' | 'warning'

type ToastPosition = 'bl' | 'br' | 'tl' | 'tr'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
  position?: ToastPosition
  /** Optional explicit dedupe key when multiple calls share the same text */
  id?: string
  /** Milliseconds to suppress duplicate messages */
  dedupeMs?: number
}

export const DEFAULT_TOAST_DURATION = 3500
export const DEFAULT_TOAST_DEDUPE_MS = 1500

let lastToastKey: string | null = null
let lastToastTimestamp = 0

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now())

function safeMessage(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function emitToast(options: ToastOptions) {
  if (typeof window === 'undefined') return
  const message = safeMessage(options.message)
  if (!message) return
  const type = options.type ?? 'info'
  const duration = typeof options.duration === 'number' ? options.duration : DEFAULT_TOAST_DURATION
  const position = options.position ?? 'bl'
  const key = options.id || `${type}:${message}`
  const dedupeMs = typeof options.dedupeMs === 'number' ? options.dedupeMs : DEFAULT_TOAST_DEDUPE_MS
  if (dedupeMs > 0 && lastToastKey === key && now() - lastToastTimestamp < dedupeMs) {
    return
  }
  lastToastKey = key
  lastToastTimestamp = now()
  const detail = {
    type,
    message,
    duration,
    position,
    id: options.id,
  }
  window.dispatchEvent(
    new CustomEvent('toast', {
      detail,
    }),
  )
}

export const toast = {
  success: (message: string, opts?: Omit<ToastOptions, 'message' | 'type'>) =>
    emitToast({ ...opts, message, type: 'success' }),
  error: (message: string, opts?: Omit<ToastOptions, 'message' | 'type'>) =>
    emitToast({ ...opts, message, type: 'error' }),
  info: (message: string, opts?: Omit<ToastOptions, 'message' | 'type'>) =>
    emitToast({ ...opts, message, type: 'info' }),
  warning: (message: string, opts?: Omit<ToastOptions, 'message' | 'type'>) =>
    emitToast({ ...opts, message, type: 'warning' }),
}
