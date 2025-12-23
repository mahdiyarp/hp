import React from 'react'
import { retroHeading } from '../retroTheme'

interface ModulePageProps {
  title: string
  description?: string
  eyebrow?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function ModulePage({ title, description, eyebrow, meta, actions, children }: ModulePageProps) {
  return (
    <div className="w-full space-y-5">
      <div className="w-full border-2 border-[#d7caa4] bg-[#f6f1df] shadow-[4px_4px_0_#c5bca5] rounded-sm px-5 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 text-right">
            {eyebrow && <p className={`${retroHeading} text-[var(--retro-muted-text)]`}>{eyebrow}</p>}
            <h1 className="text-[26px] md:text-3xl font-semibold text-[#2e2720] leading-tight">{title}</h1>
            {description && <p className="text-base text-[#6b5840] leading-7">{description}</p>}
          </div>
          <div className="flex flex-col items-start md:items-end gap-3 text-xs text-[#6b5840]">
            {meta}
            {actions}
          </div>
        </div>
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}
