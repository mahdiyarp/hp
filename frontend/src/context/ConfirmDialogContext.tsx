import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ConfirmTone = 'info' | 'danger'

export interface ConfirmDialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: ConfirmTone
}

interface DialogState {
  title: string
  message: string
  confirmText: string
  cancelText: string
  tone: ConfirmTone
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null)

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

  const closeDialog = useCallback((result: boolean) => {
    if (resolver) {
      resolver(result)
      setResolver(null)
    }
    setDialog(null)
  }, [resolver])

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      // اگر درخواست جدیدی هنگام نمایش قبلی برسد، قبلی را رد می‌کنیم تا وضعیت مشخص بماند.
      if (resolver) {
        resolver(false)
      }
      setDialog({
        title: options.title ?? 'تأیید اقدام',
        message: options.message,
        confirmText: options.confirmText ?? 'تأیید',
        cancelText: options.cancelText ?? 'انصراف',
        tone: options.tone ?? 'danger',
      })
      setResolver(() => resolve)
    })
  }, [resolver])

  const value = useMemo<ConfirmDialogContextValue>(() => ({ confirm }), [confirm])

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-[min(90vw,380px)] border-2 border-[var(--retro-border)] bg-[var(--retro-panel-bg)] shadow-[6px_6px_0_#111827]"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-4 py-3 border-b border-[var(--retro-border)] flex items-center justify-between">
              <p className="text-base font-semibold text-[var(--retro-heading-text)]">{dialog.title}</p>
              <button
                className="text-xs text-[var(--retro-muted-text)] hover:text-[var(--retro-button-bg)]"
                onClick={() => closeDialog(false)}
              >
                ×
              </button>
            </div>
            <div className="px-4 py-5 text-[var(--retro-table-header-text)] text-sm leading-6 whitespace-pre-wrap">
              {dialog.message}
            </div>
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-[var(--retro-border)] bg-[var(--retro-surface-bg)]">
              <button
                className="px-3 py-1.5 text-sm border-2 border-[var(--retro-border)] bg-white text-[var(--retro-heading-text)] shadow-[2px_2px_0_#c5bca5]"
                onClick={() => closeDialog(false)}
              >
                {dialog.cancelText}
              </button>
              <button
                className={`px-4 py-1.5 text-sm border-2 shadow-[2px_2px_0_#111827] ${dialog.tone === 'danger' ? 'bg-[#c35c5c] border-[#7f1d1d] text-white' : 'bg-[var(--retro-button-bg)] border-[var(--retro-button-bg)] text-white'}`}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) {
    throw new Error('useConfirmDialog باید داخل ConfirmDialogProvider استفاده شود')
  }
  return ctx.confirm
}
