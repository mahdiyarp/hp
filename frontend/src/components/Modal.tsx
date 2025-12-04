import React, { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children, size = 'md' }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleFocusTrap = (e: FocusEvent) => {
      if (!dialogRef.current) return
      if (isOpen && e.target && !dialogRef.current.contains(e.target as Node)) {
        // keep focus within modal
        const focusable = dialogRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('focusin', handleFocusTrap)
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = '0px'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('focusin', handleFocusTrap)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} dir="rtl" aria-modal="true" role="dialog">
      <div ref={dialogRef} className={`hp-card p-4 ${sizeClasses[size]} w-full m-4`} onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        {title && (
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button type="button" onClick={onClose} className="text-2xl font-bold leading-none text-[var(--primary)]/70 hover:text-[var(--primary)]" aria-label="Close">
              &times;
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

export default Modal
