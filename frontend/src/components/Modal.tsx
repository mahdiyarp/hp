import React from 'react'

interface ModalProps {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children, size = 'md' }) => {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} dir="rtl">
      <div className={`hp-card p-4 ${sizeClasses[size]} w-full m-4`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-2xl font-bold leading-none text-[var(--primary)]/70 hover:text-[var(--primary)]">&times;</button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

export default Modal
