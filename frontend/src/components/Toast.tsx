import React from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-100 border-green-500 text-green-900' 
                : type === 'error' ? 'bg-red-100 border-red-500 text-red-900'
                : 'bg-blue-100 border-blue-500 text-blue-900'

  return (
    <div className={`fixed bottom-4 right-4 z-50 border-2 rounded-lg px-4 py-3 shadow-lg ${bgColor}`} dir="rtl">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{message}</span>
        <button onClick={onClose} className="text-lg font-bold leading-none">&times;</button>
      </div>
    </div>
  )
}

export default Toast
