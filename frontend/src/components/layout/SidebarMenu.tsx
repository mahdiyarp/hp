import React, { useEffect, useMemo, useState } from 'react'
import { retroHeading } from '../retroTheme'
import { apiGet, apiPost } from '../../services/api'

const STORAGE_KEY = 'hesabpak_sidebar_order_v2'

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
  collapsed = false,
}: {
  modules: ModuleDef[]
  activeModuleId: string
  onNavigate: (id: string) => void
  collapsed?: boolean
}) {
  const [order, setOrder] = useState<string[]>([])

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleDef>()
    modules.forEach(m => map.set(m.id, m))
    return map
  }, [modules])

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      try {
        const serverOrder = await apiGet<string[]>('/api/users/preferences/sidebar-order')
        if (Array.isArray(serverOrder) && serverOrder.length > 0) {
          const ids = modules.map(m => m.id)
          const merged = [...serverOrder.filter(id => ids.includes(id)), ...ids.filter(id => !serverOrder.includes(id))]
          if (!cancelled) setOrder(merged)
          return
        }
      } catch {
        // ignore
      }

      const raw = localStorage.getItem(STORAGE_KEY)
      let stored: string[] = []
      try {
        if (raw) stored = JSON.parse(raw)
      } catch {
        stored = []
      }
      const ids = modules.map(m => m.id)
      const merged = [...stored.filter(id => ids.includes(id)), ...ids.filter(id => !stored.includes(id))]
      if (!cancelled) setOrder(merged)
    }

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [modules])

  useEffect(() => {
    if (order.length === 0 && modules.length > 0) {
      setOrder(modules.map(m => m.id))
    }
  }, [modules, order.length])

  useEffect(() => {
    if (order.length === 0) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    ;(async () => {
      try {
        await apiPost('/api/users/preferences/sidebar-order', { order })
      } catch {
        // ignore
      }
    })()
  }, [order])

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return
    const next = [...order]
    const sIdx = next.indexOf(sourceId)
    const tIdx = next.indexOf(targetId)
    if (sIdx === -1 || tIdx === -1) return
    next.splice(sIdx, 1)
    next.splice(tIdx, 0, sourceId)
    setOrder(next)
  }

  const orderedModules = order
    .map(id => moduleMap.get(id))
    .filter(Boolean) as ModuleDef[]

  return (
    <nav className={`flex-1 overflow-y-auto px-2 py-4 ${collapsed ? 'space-y-1' : 'space-y-2'}`}>
      {orderedModules.map(mod => {
        const isActive = mod.id === activeModuleId
        const activeColors = 'bg-[#d7caa4] text-[#1f2e3b] border-[#b7a77a]'
        const idleColors = 'bg-transparent text-[#d4d8dc] hover:bg-[#1c2833] border-[#2d3b45] hover:border-[#d7caa4]'

        if (collapsed) {
          return (
            <div key={mod.id} className="p-1">
              <button
                title={mod.label}
                className={`w-full text-center block rounded px-2 py-2 text-sm border ${isActive ? activeColors : idleColors} transition-colors duration-150`}
                onClick={() => onNavigate(mod.id)}
              >
                <span className={`${retroHeading} block text-[11px] normal-case tracking-[0.05em]`}>
                  {(mod.badge ?? mod.label[0] ?? '•').slice(0, 3)}
                </span>
              </button>
            </div>
          )
        }

        return (
          <div
            key={mod.id}
            draggable
            onDragStart={e => onDragStart(e, mod.id)}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, mod.id)}
          >
            <button
              className={`w-full text-right border-2 rounded px-4 py-3 transition-colors duration-150 text-sm ${
                isActive ? activeColors + ' shadow-[3px_3px_0_#b7a77a]' : idleColors
              }`}
              onClick={() => onNavigate(mod.id)}
            >
              <span className={`${retroHeading} block text-[11px] normal-case tracking-[0.05em]`}>
                {mod.badge ?? 'MODULE'}
              </span>
              <span className="text-lg font-semibold">{mod.label}</span>
              <span className="block text-[11px] mt-1 text-[#aeb4b9]">{mod.description}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
