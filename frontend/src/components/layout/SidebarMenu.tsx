import React from 'react'
import { retroHeading } from '../retroTheme'

type ModuleDef = {
  id: string
  label: string
  description: string
  badge?: string
}

export default function SidebarMenu({
  modules,
  activeModuleId,
  onNavigate,
  collapsed,
}: {
  modules: ModuleDef[]
  activeModuleId: string
  onNavigate: (id: string) => void
  collapsed?: boolean
}) {
  return (
    <nav className={`flex-1 overflow-y-auto px-2 py-4 ${collapsed ? 'space-y-1' : 'space-y-2'}`}>
      {modules.map(mod => {
        const isActive = mod.id === activeModuleId
        if (collapsed) {
          return (
            <div key={mod.id} className="p-1">
              <button
                title={mod.label}
                className={`w-full text-center block rounded-sm px-2 py-2 text-sm border-0 bg-transparent text-[#d4d8dc] hover:bg-[#0f1720] ${isActive ? 'bg-[#d7caa4] text-[var(--retro-table-header-text)]' : ''} transition-colors duration-150`}
                onClick={() => onNavigate(mod.id)}
              >
                <span className={`${retroHeading} block text-[11px] transition-opacity duration-200`}>{(mod.badge ?? mod.label[0] ?? '•').slice(0,3)}</span>
              </button>
            </div>
          )
        }

        const base = 'w-full text-right border-2 rounded-sm px-4 py-3 transition-all duration-150 text-sm'
        const activeClass = 'bg-[#d7caa4] text-[var(--retro-table-header-text)] border-[#b7a77a] shadow-[3px_3px_0_#b7a77a]'
        const idleClass = 'border-[#2d3b45] text-[#d4d8dc] hover:border-[#d7caa4] hover:text-[#f5f1e6]'
        return (
          <div
            key={mod.id}
          >
            <button
              className={`${base} ${isActive ? activeClass : idleClass}`}
              onClick={() => onNavigate(mod.id)}
            >
              <span className={`${retroHeading} block text-[11px] transition-opacity duration-200`}>{mod.badge ?? 'MODULE'}</span>
              <span className="text-lg font-semibold transition-opacity duration-200">{mod.label}</span>
              <span className="block text-[11px] mt-1 text-[#aeb4b9] transition-opacity duration-200">{mod.description}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
