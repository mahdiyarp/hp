import React from 'react'
import { retroHeading, retroPanelPadded } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'

interface KpiWidgetProps {
  title: string
  value: number
  unit: string
}

export default function KpiWidget({ title, value, unit }: KpiWidgetProps) {
  return (
    <div className={retroPanelPadded}>
      <p className={retroHeading}>{title}</p>
      <p className="text-2xl font-semibold mt-2">
        {formatNumberFa(value)} <span className="text-sm">{unit}</span>
      </p>
    </div>
  )
}
