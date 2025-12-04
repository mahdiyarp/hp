import React from 'react'
import { retroButton, retroHeading, retroPanelPadded } from '../retroTheme'

interface QuickActionsWidgetProps {
  onNavigate: (moduleId: string) => void
}

export default function QuickActionsWidget({ onNavigate }: QuickActionsWidgetProps) {
  return (
    <div className={retroPanelPadded}>
      <p className={retroHeading}>عملیات سریع</p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button className={retroButton} onClick={() => onNavigate('sales')}>
          فاکتور جدید
        </button>
        <button className={retroButton} onClick={() => onNavigate('finance')}>
          پرداخت جدید
        </button>
        <button className={retroButton} onClick={() => onNavigate('crm')}>
          شخص جدید
        </button>
        <button className={retroButton} onClick={() => onNavigate('inventory')}>
          کالای جدید
        </button>
      </div>
    </div>
  )
}
