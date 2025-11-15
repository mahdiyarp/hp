import React, { useEffect, useMemo, useState } from 'react'
import { retroHeading } from '../retroTheme'
import { apiGet, apiPost } from '../../services/api'

const STORAGE_KEY = 'hesabpak_sidebar_order_v1'

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
}: {
  modules: ModuleDef[]
  activeModuleId: string
  onNavigate: (id: string) => void
  collapsed?: boolean
}) {
  const [order, setOrder] = useState<string[]>([])
  const [expandedSettings, setExpandedSettings] = useState(false)
  const collapsed = (arguments[0] && (arguments[0] as any).collapsed) || false

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      // Try server-side first (authenticated)
      try {
        const serverOrder = await apiGet<string[]>('/api/users/preferences/sidebar-order')
        if (Array.isArray(serverOrder) && serverOrder.length > 0) {
          const ids = modules.map(m => m.id)
          const merged = [...serverOrder.filter((id: string) => ids.includes(id)), ...ids.filter(id => !serverOrder.includes(id))]
          if (!cancelled) setOrder(merged)
          return
        }
      } catch (e) {
        // ignore - fallback to localStorage
      }

      const raw = localStorage.getItem(STORAGE_KEY)
      let stored: string[] = []
      try {
        if (raw) stored = JSON.parse(raw)
      } catch (e) {
        stored = []
      }

      const ids = modules.map(m => m.id)
      // Start with stored order, append any new modules
      const merged = [...stored.filter(id => ids.includes(id)), ...ids.filter(id => !stored.includes(id))]
      if (!cancelled) setOrder(merged)
    }

    loadOrder()
    return () => { cancelled = true }
  }, [modules])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    // also try to persist server-side (best-effort)
    ;(async () => {
      try {
        await apiPost('/api/users/preferences/sidebar-order', { order })
      } catch (e) {
        // ignore server-side persist errors
      }
    })()
  }, [order])

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleDef>()
    modules.forEach(m => map.set(m.id, m))
    return map
  }, [modules])

  const settingsChildren = useMemo(() => {
    return modules.filter(m => /system|settings|user|security|integration|auth/i.test(m.id))
  }, [modules])

  const nonSettings = useMemo(() => {
    return order.filter(id => !settingsChildren.some(s => s.id === id)).map(id => moduleMap.get(id)).filter(Boolean) as ModuleDef[]
  }, [order, moduleMap, settingsChildren])

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

  return (
    <nav className={`flex-1 overflow-y-auto px-2 py-4 ${collapsed ? 'space-y-1' : 'space-y-2'}`}>
      {nonSettings.map(mod => {
        const isActive = mod.id === activeModuleId
        if (collapsed) {
          return (
            <div key={mod.id} className="p-1">
              <button
                title={mod.label}
                className={`w-full text-center block rounded-sm px-2 py-2 text-sm border-0 bg-transparent text-[#d4d8dc] hover:bg-[#0f1720] ${isActive ? 'bg-[#d7caa4] text-[#1f2e3b]' : ''}`}
                onClick={() => onNavigate(mod.id)}
              >
                <span className={`${retroHeading} block text-[11px]`}>{(mod.badge ?? mod.label[0] ?? '•').slice(0,3)}</span>
              </button>
            </div>
          )
        }

        const base = 'w-full text-right border-2 rounded-sm px-4 py-3 transition-all duration-150 text-sm'
        const activeClass = 'bg-[#d7caa4] text-[#1f2e3b] border-[#b7a77a] shadow-[3px_3px_0_#b7a77a]'
        const idleClass = 'border-[#2d3b45] text-[#d4d8dc] hover:border-[#d7caa4] hover:text-[#f5f1e6]'
        return (
          <div
            key={mod.id}
            draggable
            onDragStart={e => onDragStart(e, mod.id)}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, mod.id)}
          >
            <button
              className={`${base} ${isActive ? activeClass : idleClass}`}
              onClick={() => onNavigate(mod.id)}
            >
              <span className={`${retroHeading} block text-[11px]`}>{mod.badge ?? 'MODULE'}</span>
              <span className="text-lg font-semibold">{mod.label}</span>
              <span className="block text-[11px] mt-1 text-[#aeb4b9]">{mod.description}</span>
            </button>
          </div>
        )
      })}

      {settingsChildren.length > 0 && (
        <div className="pt-3 border-t border-[#2d3b45]">
          {!collapsed && (
            <button
              className="w-full text-right border-2 rounded-sm px-4 py-3 text-sm bg-transparent hover:bg-[#0f1720]"
              onClick={() => setExpandedSettings(s => !s)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className={`${retroHeading} text-[11px]`}>تنظیمات</p>
                  <div className="text-lg font-semibold">پنل تنظیمات</div>
                </div>
                <div className="text-sm text-[#aeb4b9]">{expandedSettings ? '–' : '+'}</div>
              </div>
            </button>
          )}

          {expandedSettings && !collapsed && (
            <div className="mt-3 space-y-2">
              {settingsChildren.map(s => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={e => onDragStart(e, s.id)}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, s.id)}
                >
                  <button
                    className={`w-full text-right border-2 rounded-sm px-4 py-2 text-sm border-[#28333a] text-[#d4d8dc] hover:border-[#d7caa4] hover:text-[#f5f1e6]`}
                    onClick={() => onNavigate(s.id)}
                  >
                    <span className={`${retroHeading} block text-[11px]`}>{s.badge ?? 'SET'}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="block text-[11px] mt-1 text-[#aeb4b9]">{s.description}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
