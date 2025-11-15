import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { retroBadge, retroButton, retroHeading, retroPanel, retroMuted } from '../retroTheme'
import { useI18n } from '../../i18n/I18nContext'
import SidebarMenu from './SidebarMenu'
import type { SyncRecord } from '../../App'
import GlobalSearch from '../GlobalSearch'
import { formatNumberFa, toPersianDigits } from '../../utils/num'

export interface SmartDateState {
  isoDate: string | null
  jalali: string | null
}

export interface ModuleComponentProps {
  smartDate: SmartDateState
  onSmartDateChange: (next: SmartDateState) => void
  sync: SyncRecord | null
  user: { username: string; role: string } | null
  onNavigate: (moduleId: string) => void
}

export interface ModuleDefinition {
  id: string
  label: string
  description: string
  component: React.ComponentType<ModuleComponentProps>
  badge?: string
  icon?: React.ReactNode
}

interface AppShellProps {
  modules: ModuleDefinition[]
  sync: SyncRecord | null
  user: { username: string; role: string } | null
  onLogout: () => void
}

const SMART_DATE_ISO_KEY = 'hesabpak_selected_date'
const SMART_DATE_JALALI_KEY = 'hesabpak_selected_jalali'

function normalizeIsoDate(value: string | null | undefined) {
  if (!value) return null
  return value.length >= 10 ? value.slice(0, 10) : value
}

export default function AppShell({ modules, sync, user, onLogout }: AppShellProps) {
  const { t } = useI18n()
  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleDefinition>()
    modules.forEach(m => map.set(m.id, m))
    return map
  }, [modules])

  const initialModuleId = useMemo(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && moduleMap.has(hash)) return hash
    return modules[0]?.id ?? ''
  }, [moduleMap, modules])

  const [activeModuleId, setActiveModuleId] = useState(initialModuleId)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hesabpak_sidebar_collapsed_v1') === '1'
    } catch (e) {
      return false
    }
  })
  const [smartDate, setSmartDate] = useState<SmartDateState>({
    isoDate: normalizeIsoDate(localStorage.getItem(SMART_DATE_ISO_KEY)),
    jalali: localStorage.getItem(SMART_DATE_JALALI_KEY),
  })

  const navigate = useCallback(
    (id: string) => {
      if (!moduleMap.has(id)) return
      window.location.hash = id
      setActiveModuleId(id)
    },
    [moduleMap],
  )

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('hesabpak_sidebar_collapsed_v1', next ? '1' : '0') } catch (e) {}
      return next
    })
  }, [])

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && moduleMap.has(hash)) {
        setActiveModuleId(hash)
      }
    }
    window.addEventListener('hashchange', handler)
    
    // Listen for custom module switch events
    const handleModuleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent
      const targetModule = customEvent.detail?.module
      if (targetModule && moduleMap.has(targetModule)) {
        navigate(targetModule)
      }
    }
    window.addEventListener('switch-module', handleModuleSwitch)
    
    return () => {
      window.removeEventListener('hashchange', handler)
      window.removeEventListener('switch-module', handleModuleSwitch)
    }
  }, [moduleMap, navigate])

  const handleSmartDateChange = useCallback((next: SmartDateState) => {
    setSmartDate(next)
    if (next.isoDate) {
      localStorage.setItem(SMART_DATE_ISO_KEY, next.isoDate)
    } else {
      localStorage.removeItem(SMART_DATE_ISO_KEY)
    }
    if (next.jalali) {
      localStorage.setItem(SMART_DATE_JALALI_KEY, next.jalali)
    } else {
      localStorage.removeItem(SMART_DATE_JALALI_KEY)
    }
  }, [])

  useEffect(() => {
    const storedIso = normalizeIsoDate(localStorage.getItem(SMART_DATE_ISO_KEY))
    const storedJalali = localStorage.getItem(SMART_DATE_JALALI_KEY)
    setSmartDate({ isoDate: storedIso, jalali: storedJalali })
  }, [])

  const activeModule = moduleMap.get(activeModuleId) ?? modules[0]
  const ActiveComponent = activeModule?.component

  const clockDriftMs = useMemo(() => {
    if (!sync?.epochMs) return null
    const clientMs = Date.parse(sync.clientUtc)
    if (Number.isNaN(clientMs)) return null
    return Math.round(clientMs - sync.epochMs)
  }, [sync])

  return (
    <div className="min-h-screen bg-[#141d24] text-[#f5f1e6] flex">
      <div className="flex-1 flex flex-col bg-[#e9e4d8] text-[#2e2720]">
        <header className="border-b-4 border-[#d7caa4] bg-[#1f2e3b] text-[#f5f1e6] shadow-[0_6px_0_#b7a77a]">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className={`${retroHeading} text-[#d7caa4]`}>{t('active_module', 'ماژول فعال')}</p>
                <h2 className="text-3xl font-semibold mt-2">
                  {activeModule?.label ?? '—'}
                </h2>
                <p className="text-sm text-[#c3bca5] mt-1 leading-6">
                  {activeModule?.description}
                </p>
              </div>
              <div className="flex flex-col items-start lg:items-end text-sm gap-1">
                <span>کاربر: {user?.username ?? '---'}</span>
                <span>نقش دسترسی: {user?.role ?? '---'}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`${retroBadge} bg-[#2d3b45] border-[#4b5f6f]`}>
                    {smartDate.jalali ? `تاریخ جلالی: ${smartDate.jalali}` : 'تاریخ جلالی ثبت نشده'}
                  </span>
                  <span className={`${retroBadge} bg-[#2d3b45] border-[#4b5f6f]`}>
                    {smartDate.isoDate ? `تاریخ میلادی: ${smartDate.isoDate}` : 'تاریخ میلادی ثبت نشده'}
                  </span>
                </div>
            </div>
          </div>
          <div className="mt-2">
            <GlobalSearch onNavigate={navigate} />
          </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className={`${retroPanel} px-4 py-3 text-xs space-y-1`}>
                <p className={`${retroHeading} text-[#7a6b4f]`}>وضعیت زمان سرور</p>
                <p>
                  {sync?.serverUtc
                    ? `UTC: ${toPersianDigits(sync.serverUtc.slice(0, 19).replace('T', ' '))}`
                    : 'در انتظار همگام‌سازی'}
                </p>
                {sync?.serverLocal && (
                  <p>زمان محلی سرور: {toPersianDigits(sync.serverLocal.slice(0, 19).replace('T', ' '))}</p>
                )}
                {sync?.jalali && <p>تاریخ جلالی سرور: {sync.jalali}</p>}
                <p className={`text-[#7a6b4f]`}>
                  اختلاف منطقه زمانی: {toPersianDigits(sync?.serverOffset ?? `${sync?.serverOffsetSeconds ?? 0}s`)}
                </p>
                {clockDriftMs !== null && (
                  <p className={`text-[#7a6b4f]`}>
                    اختلاف ساعت با کلاینت: {formatNumberFa(clockDriftMs)} میلی‌ثانیه
                  </p>
                )}
                {sync?.latencyMs !== null && sync?.latencyMs !== undefined && (
                  <p className={`text-[#7a6b4f]`}>
                    تاخیر شبکه: {formatNumberFa(sync?.latencyMs ?? 0)} میلی‌ثانیه
                  </p>
                )}
              </div>
              <div className="flex sm:flex-row flex-col gap-2 text-sm">
                <button className={retroButton} onClick={onLogout}>
                  خروج از سیستم
                </button>
                <button
                  className={`${retroButton} !bg-[#2d3b45] !border-[#1f2e3b]`}
                  onClick={() => navigate('system')}
                >
                  پنل تنظیمات
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            {ActiveComponent ? (
              <ActiveComponent
                smartDate={smartDate}
                onSmartDateChange={handleSmartDateChange}
                sync={sync}
                user={user}
                onNavigate={navigate}
              />
            ) : (
              <div className={`${retroPanel} p-6`}>
                <p className={`${retroHeading} text-[#7a6b4f]`}>{t('module_not_found', 'ماژول یافت نشد')}</p>
                <p className="mt-2 text-sm">
                  ماژول انتخاب‌شده یافت نشد. از منوی کناری گزینه دیگری را انتخاب کنید.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} border-r-4 border-[#d7caa4] bg-[#111821] flex flex-col transition-all duration-200 ease-in-out` }>
        <div className="p-4 border-b border-[#2d3b45] flex items-center justify-between gap-2">
          <div>
            <p className={`${retroHeading} text-[#d7caa4]`}>{t('app_name', 'حساب‌پاک')}</p>
            <div className={`${sidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'} transition-opacity duration-200`}> 
              {!sidebarCollapsed && (
                <>
                  <h1 className="text-2xl font-semibold mt-2">کنسول کلاسیک</h1>
                  <p className="text-xs text-[#aeb4b9] mt-3 leading-6">
                    ماژول‌های اصلی سیستم حسابداری را از این منو انتخاب کنید. رابط کاربری با تم کلاسیک برای
                    کارایی و یادآوری سیستم‌های قدیمی طراحی شده است.
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            title={sidebarCollapsed ? 'باز کردن منو' : 'کوچک‌سازی منو'}
            onClick={toggleSidebar}
            className="text-xs px-2 py-1 bg-[#1f2e3b] rounded border border-[#2d3b45]"
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <SidebarMenu
          modules={modules.map(m => ({ id: m.id, label: m.label, description: m.description, badge: m.badge }))}
          activeModuleId={activeModuleId}
          onNavigate={navigate}
          collapsed={sidebarCollapsed}
        />
        <div className="p-4 border-t border-[#2d3b45] space-y-3 text-xs">
          <div>
            <p className={`${retroHeading} text-[#d7caa4]`}>{t('smart_date', 'تاریخ هوشمند')}</p>
            <p className="mt-1">
              {smartDate.jalali ? smartDate.jalali : 'تاریخ انتخاب نشده'}
            </p>
            {smartDate.isoDate && (
              <p className="text-[#aeb4b9] mt-1">تاریخ میلادی: {smartDate.isoDate}</p>
            )}
          </div>
          {sync && (
            <div>
              <p className={`${retroHeading} text-[#d7caa4]`}>اطلاعات همگام‌سازی</p>
              <p className="mt-1 text-[#aeb4b9] text-[11px] leading-5">
                UTC سرور: {toPersianDigits(sync.serverUtc.slice(0, 19).replace('T', ' '))}
              </p>
              <p className="text-[#aeb4b9] text-[11px] leading-5">
                اختلاف: {formatNumberFa(sync.serverOffsetSeconds)} ثانیه
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
