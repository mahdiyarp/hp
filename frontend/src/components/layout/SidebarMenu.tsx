import React, { useEffect, useMemo, useState } from 'react'
import { retroHeading } from '../retroTheme'
import { apiGet, apiPost } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

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
}) {
  const { user } = useAuth()
  const [order, setOrder] = useState<string[]>([])
  const [expandedSettings, setExpandedSettings] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      // Try server-side first (authenticated)
      try {
        // Avoid early 401s: only fetch from server after auth tokens exist
        const hasToken = !!localStorage.getItem('hesabpak_access_token')
        if (hasToken) {
          const serverOrder = await apiGet<string[]>('/api/users/preferences/sidebar-order')
          if (Array.isArray(serverOrder) && serverOrder.length > 0) {
            const ids = modules.map((m) => m.id)
            const merged = [
              ...serverOrder.filter((id: string) => ids.includes(id)),
              ...ids.filter((id) => !serverOrder.includes(id)),
            ]
            if (!cancelled) setOrder(merged)
            return
          }
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

      const ids = modules.map((m) => m.id)
      // Start with stored order, append any new modules
      const merged = [
        ...stored.filter((id) => ids.includes(id)),
        ...ids.filter((id) => !stored.includes(id)),
      ]
      if (!cancelled) setOrder(merged)
    }

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [modules])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    // also try to persist server-side (best-effort)
    ;(async () => {
      try {
        const hasToken = !!localStorage.getItem('hesabpak_access_token')
        if (hasToken) {
          await apiPost('/api/users/preferences/sidebar-order', { order })
        }
      } catch (e) {
        // ignore server-side persist errors
      }
    })()
  }, [order])

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleDef>()
    modules.forEach((m) => map.set(m.id, m))
    return map
  }, [modules])

  const settingsChildren = useMemo(() => {
    const all = modules.filter((m) =>
      /system|settings|user|security|integration|auth|developer|bank|banks|branch|access-control|roles|permissions/i.test(
        m.id,
      ),
    )
    // hide developer for non-developers
    if (!user || (user.role || '').toLowerCase() !== 'developer') {
      return all.filter((m) => m.id !== 'developer')
    }
    return all
  }, [modules, user])

  // گروه توسعه‌دهنده: تمام ماژول‌های dev زیر یک والد نمایش داده شوند
  const devChildIds = ['developer', 'dev-assistant', 'sms-panel', 'papi-panel', 'audit']
  const devChildren = settingsChildren.filter((m) => devChildIds.includes(m.id))
  const settingsNonDev = settingsChildren.filter((m) => !devChildIds.includes(m.id))

  const nonSettings = useMemo(() => {
    return order
      .filter((id) => !settingsChildren.some((s) => s.id === id))
      .map((id) => moduleMap.get(id))
      .filter(Boolean) as ModuleDef[]
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
    <nav className={`flex-1 overflow-y-auto px-2 py-1 space-y-2`}>
      {nonSettings.map((mod) => {
        const isActive = mod.id === activeModuleId
        const base =
          'w-full text-right border-2 rounded-sm px-4 py-3 transition-all duration-150 text-sm'
        const activeClass =
          'bg-[var(--hp-sidebar-active-bg)] text-[var(--retro-table-header-text)] border-[var(--hp-sidebar-active-border)] shadow-[3px_3px_0_var(--hp-sidebar-active-shadow)]'
        const idleClass =
          'border-[var(--hp-sidebar-divider)] text-[var(--hp-sidebar-text)] hover:border-[var(--hp-sidebar-border-accent)] hover:text-[var(--hp-sidebar-text-hover)]'
        return (
          <div
            key={mod.id}
            draggable
            onDragStart={(e) => onDragStart(e, mod.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, mod.id)}
          >
            <button
              className={`${base} ${isActive ? activeClass : idleClass}`}
              onClick={() => onNavigate(mod.id)}
            >
              <span className={`${retroHeading} block text-[11px] transition-opacity duration-200`}>
                {mod.badge ?? 'MODULE'}
              </span>
              <span className="text-lg font-semibold transition-opacity duration-200">
                {mod.label}
              </span>
              <span className="block text-[11px] mt-1 text-[var(--hp-sidebar-muted)] transition-opacity duration-200">
                {mod.description}
              </span>
            </button>
          </div>
        )
      })}

      {settingsChildren.length > 0 && (
        <div className="pt-3 border-t border-[var(--hp-sidebar-divider)]">
          <button
            className="w-full text-right border-2 rounded-sm px-4 py-3 text-sm bg-transparent hover:bg-[var(--hp-sidebar-hover-bg)]"
            onClick={() => setExpandedSettings((s) => !s)}
          >
              <div className="flex justify-between items-center">
                <div>
                  <p className={`${retroHeading} text-[11px]`}>تنظیمات</p>
                  <div className="text-lg font-semibold">پنل تنظیمات</div>
                </div>
                <div className="text-sm text-[var(--hp-sidebar-muted)]">{expandedSettings ? '–' : '+'}</div>
              </div>
            </button>

          {expandedSettings && (
            <div className="mt-3 space-y-2">
              {settingsNonDev.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, s.id)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, s.id)}
                >
                  <button
                    className={`w-full text-right border-2 rounded-sm px-4 py-2 text-sm border-[var(--hp-sidebar-divider)] text-[var(--hp-sidebar-text)] hover:border-[var(--hp-sidebar-border-accent)] hover:text-[var(--hp-sidebar-text-hover)]`}
                    onClick={() => onNavigate(s.id)}
                  >
                    <span className={`${retroHeading} block text-[11px]`}>{s.badge ?? 'SET'}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="block text-[11px] mt-1 text-[var(--hp-sidebar-muted)]">{s.description}</span>
                  </button>
                </div>
              ))}

              {devChildren.length > 0 && (
                <div className="border border-[var(--hp-sidebar-divider)] rounded-sm">
                  <button
                    className={`w-full text-right px-4 py-3 text-sm text-[var(--hp-sidebar-text)] hover:bg-[var(--hp-sidebar-hover-bg)] border-b border-[var(--hp-sidebar-divider)]`}
                    onClick={() => onNavigate('developer')}
                  >
                    <span className={`${retroHeading} block text-[11px]`}>DEV</span>
                    <span className="text-sm font-semibold">کنسول توسعه‌دهنده</span>
                    <span className="block text-[11px] mt-1 text-[var(--hp-sidebar-muted)]">
                      پنل کامل دیباگ و ابزارها
                    </span>
                  </button>
                  <div className="divide-y divide-[var(--hp-sidebar-divider)]">
                    {devChildren
                      .filter((c) => c.id !== 'developer')
                      .map((c) => (
                        <button
                          key={c.id}
                          className={`w-full text-right px-4 py-2 text-sm text-[var(--hp-sidebar-text)] hover:bg-[var(--hp-sidebar-hover-bg)]`}
                          onClick={() => onNavigate(c.id)}
                        >
                          <span className={`${retroHeading} block text-[11px]`}>{c.badge ?? 'DEV'}</span>
                          <span className="text-sm font-semibold">{c.label}</span>
                          <span className="block text-[11px] mt-1 text-[var(--hp-sidebar-muted)]">{c.description}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
