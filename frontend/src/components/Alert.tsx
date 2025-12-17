import React from 'react'

type Variant = 'info' | 'success' | 'error' | 'warning'

interface AlertProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

const styles: Record<Variant, string> = {
  info: 'border-[var(--retro-border)] bg-[var(--retro-panel-bg)] text-[var(--retro-table-header-text)] shadow-[3px_3px_0_var(--retro-shadow)]',
  success: 'border-[#4f704f] bg-[#e7f4e7] text-[#295329] shadow-[3px_3px_0_#4f704f]',
  error: 'border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[3px_3px_0_#c35c5c]',
  warning: 'border-[#b7a77a] bg-[#faf4df] text-[#6b5840] shadow-[3px_3px_0_#b7a77a]',
}

export default function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  return (
    <div className={`border-2 px-3 py-2 text-sm ${styles[variant]} ${className}`}>{children}</div>
  )
}
