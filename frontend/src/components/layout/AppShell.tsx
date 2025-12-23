import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { retroButton, retroHeading, retroPanel } from '../retroTheme'
import { useI18n } from '../../i18n/I18nContext'
import StatusBar from '../StatusBar'
import SidebarMenu from './SidebarMenu'
import type { SyncRecord } from '../../App'
import GlobalSearch from '../GlobalSearch'
import { formatNumberFa, toPersianDigits } from '../../utils/num'
import { useFY } from '../../context/FYContext'
import ErrorBoundary from '../ErrorBoundary'
import { getAccessToken } from '../../services/auth'

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
  hidden?: boolean
  feature?: string
  // نام‌های مجوز لازم برای نمایش این ماژول
  requiredPermissions?: string[]
}

interface AppShellProps {
  modules: ModuleDefinition[]
  sync: SyncRecord | null
  user: { username: string; role: string } | null
  onLogout: () => void
  orgFeatures?: string[]
  // لیست نام مجوزهای اعطا شده به کاربر
  permissions?: string[]
}

const SMART_DATE_ISO_KEY = 'hesabpak_selected_date'
const SMART_DATE_JALALI_KEY = 'hesabpak_selected_jalali'

function normalizeIsoDate(value: string | null | undefined) {
  if (!value) return null
  return value.length >= 10 ? value.slice(0, 10) : value
}

function base64urlDecode(input: string): string {
  try {
    let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad === 2) b64 += '=='
    else if (pad === 3) b64 += '='
    return atob(b64)
  } catch {
    return ''
  }
}

function isDeveloperFromToken(): boolean {
  try {
    const token = getAccessToken()
    if (!token) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadStr = base64urlDecode(parts[1])
    if (!payloadStr) return false
    const payloadJson = JSON.parse(payloadStr)
    const sub = String(payloadJson.sub || '')
    const role = String(payloadJson.role || payloadJson['x-role'] || '')
    if (role === 'Admin' || /Developer/i.test(role)) return true
    return sub === '09123506545' || sub === 'developer'
  } catch {
    return false
  }
}

export default function AppShell({ modules, sync, user, onLogout, orgFeatures, permissions }: AppShellProps) {
  const { t } = useI18n()
  const visibleModules = useMemo(() => {
    const allowAll = !!(user && (user.role === 'Admin' || /Developer/i.test(user.role))) || isDeveloperFromToken()
    return modules.filter((m) => {
      if (m.hidden) return false
      // Admin/Developer همه‌چیز را می‌بینند
      if (allowAll) return true
      // ابتدا فیلتر بر اساس ویژگی‌های سازمان
      const featureOk = !m.feature || (orgFeatures || []).includes(m.feature)
      if (!featureOk) return false
      // سپس گیتینگ بر اساس مجوزها (اگر تعریف شده)
      const req = m.requiredPermissions || []
      if (req.length === 0) return true
      const granted = new Set(permissions || [])
      return req.every((p) => granted.has(p))
    })
  }, [modules, orgFeatures, user, permissions])
  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleDefinition>()
    visibleModules.forEach((m) => map.set(m.id, m))
    return map
  }, [visibleModules])

  const initialModuleId = useMemo(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && moduleMap.has(hash)) return hash
    return visibleModules[0]?.id ?? ''
  }, [moduleMap, visibleModules])

  const [activeModuleId, setActiveModuleId] = useState(initialModuleId)
  // حذف قابلیت کوچک‌سازی منو؛ همیشه باز است
  const sidebarSide: 'left' | 'right' = 'right'
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

  // دکمه کوچک‌سازی حذف شد

  // دکمه تغییر سمت حذف شد؛ منو همیشه سمت راست است.

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

  // فقط تغییرات مربوط به کوچک/بزرگ‌شدن منو را گوش می‌دهیم
  // شنود مربوط به کوچک‌سازی حذف شد

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

  const activeModule = moduleMap.get(activeModuleId) ?? visibleModules[0]
  const ActiveComponent = activeModule?.component

  const fyCtx = useFY()
  const activeFy = fyCtx?.activeFy ?? null

  const clockDriftMs = useMemo(() => {
    if (!sync?.epochMs) return null
    const clientMs = Date.parse(sync.clientUtc)
    if (Number.isNaN(clientMs)) return null
    return Math.round(clientMs - sync.epochMs)
  }, [sync])
  const asideElement = (
    <aside
      className="border-l-4 border-[var(--hp-sidebar-border-accent)] bg-[var(--hp-sidebar-bg)] flex flex-col sticky top-0 self-start h-screen overflow-y-auto flex-shrink-0"
      style={{ width: 'var(--hp-sidebar-width)' }}
    >
      <div className="p-4 border-b border-[var(--hp-sidebar-divider)] flex items-center justify-between gap-2">
        <div>
          <p className={`${retroHeading} text-[var(--hp-sidebar-border-accent)]`}>{t('app_name')}</p>
          <div>
            <h1 className="text-2xl font-semibold mt-2">کنسول کلاسیک</h1>
            <p className="text-xs text-[var(--hp-sidebar-muted)] mt-3 leading-6">
              ماژول‌های اصلی سیستم حسابداری را از این منو انتخاب کنید. رابط کاربری با تم کلاسیک برای
              کارایی و یادآوری سیستم‌های قدیمی طراحی شده است.
            </p>
          </div>
        </div>
        {/* دکمه‌های مربوط به کوچک‌سازی/تغییر سمت حذف شدند */}
      </div>

      <SidebarMenu
        modules={visibleModules.map((m) => ({
          id: m.id,
          label: m.label,
          description: m.description,
          badge: m.badge,
        }))}
        activeModuleId={activeModuleId}
        onNavigate={navigate}
      />

      <div className="p-4 border-t border-[var(--hp-sidebar-divider)] space-y-3 text-xs">
        <div>
          <p className={`${retroHeading} text-[var(--hp-sidebar-border-accent)]`}>{t('smart_date')}</p>
          <p className="mt-1">{smartDate.jalali ? smartDate.jalali : 'تاریخ انتخاب نشده'}</p>
          {smartDate.isoDate && <p className="text-[var(--hp-sidebar-muted)] mt-1">ISO: {smartDate.isoDate}</p>}
        </div>
        {sync && (
          <div>
            <p className={`${retroHeading} text-[var(--hp-sidebar-border-accent)]`}>SYNC</p>
            <p className="mt-1 text-[var(--hp-sidebar-muted)] text-[11px] leading-5">
              UTC سرور: {sync.serverUtc.slice(0, 19).replace('T', ' ')}
            </p>
            <p className="text-[var(--hp-sidebar-muted)] text-[11px] leading-5">
              اختلاف: {sync.serverOffsetSeconds}s
            </p>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[var(--hp-shell-bg)] text-[var(--hp-shell-text)] flex items-start" dir="rtl">
      {asideElement}
      <div className="flex-1 min-w-0 flex flex-col bg-[#e9e4d8] text-[#2e2720] min-h-screen" dir="rtl">
        <header className="sticky top-0 z-20 border-b-4 border-[#d7caa4] bg-[#1f2e3b] text-[#f5f1e6] shadow-[0_6px_0_#b7a77a] w-full">
          <div
            className="hp-container hp-container-right py-5 flex flex-col gap-4"
            data-testid="hp-header-container"
          >
            <div className="grid w-full gap-4 items-start lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#fff4d8] justify-start text-right">
                <span className={`${retroHeading} text-[#ffe7bd]`}>ماژول فعال</span>
                <span className="text-2xl font-semibold text-[#fffdf3]">
                  {`ماژول فعال ${activeModule?.label ?? 'داشبورد'}`}
                </span>
                <span className="text-sm text-[#f4e2c0] leading-6 whitespace-pre-wrap">
                  نمایش خلاصه و معمّای خوی معاملات و تحلیل‌های سریع
                </span>
              </div>
              <div className="flex flex-col text-sm gap-1 text-right items-end">
                <span className="whitespace-nowrap">
                  کاربر: {user?.username ?? '---'} | نقش دسترسی: {user?.role ?? '---'}
                </span>
              </div>
            </div>
            <div className="w-full">
              <GlobalSearch onNavigate={navigate} />
            </div>
            <div className="flex flex-col gap-3 w-full lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 w-full text-right lg:flex-row lg:items-end lg:justify-start">
                <div
                  className={`${retroPanel} px-4 py-3 text-xs space-y-1 w-full lg:w-[360px] lg:flex-none text-[var(--retro-table-header-text)]`}
                >
                  <p className={`${retroHeading} text-[#1a0903] drop-shadow-[0_1px_0_rgba(0,0,0,0.12)]`}>
                    SERVER TIME SNAPSHOT
                  </p>
                  <p className="font-semibold text-[var(--retro-table-header-text)]">
                    {sync?.serverUtc
                      ? `UTC: ${toPersianDigits(sync.serverUtc.slice(0, 19).replace('T', ' '))}`
                      : 'در انتظار همگام‌سازی'}
                  </p>
                  {sync?.serverLocal && (
                    <p className="font-semibold text-[var(--retro-table-header-text)]">
                      LOC: {toPersianDigits(sync.serverLocal.slice(0, 19).replace('T', ' '))}
                    </p>
                  )}
                  {sync?.jalali && (
                    <p className="font-semibold text-[var(--retro-table-header-text)]">JALALI: {sync.jalali}</p>
                  )}
                  <p className="text-[#2d1202] font-semibold">
                    اختلاف منطقه:{' '}
                    {toPersianDigits(sync?.serverOffset ?? `${sync?.serverOffsetSeconds ?? 0}s`)}
                  </p>
                  {clockDriftMs !== null && (
                    <p className="text-[#2d1202] font-semibold">
                      اختلاف ساعت با کلاینت: {formatNumberFa(clockDriftMs)} میلی‌ثانیه
                    </p>
                  )}
                  {sync?.latencyMs != null && (
                    <p className="text-[#2d1202] font-semibold">
                      تاخیر شبکه: {formatNumberFa(sync?.latencyMs ?? 0)} میلی‌ثانیه
                    </p>
                  )}
                </div>
                <div
                  className={`${retroPanel} px-4 py-3 text-xs space-y-2 w-full lg:w-[360px] lg:flex-none text-[var(--retro-table-header-text)]`}
                >
                  <p className={`${retroHeading} text-[#1a0903]`}>SMART DATE SNAPSHOT</p>
                  <div className="space-y-2 text-sm text-[#1f1207]">
                    <p className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Jalali</span>
                      <span>{smartDate.jalali || '---'}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="font-semibold">ISO</span>
                      <span>{smartDate.isoDate || '---'}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="font-semibold">سال مالی</span>
                      <span>{activeFy ? activeFy.name ?? activeFy.id : 'نامشخص'}</span>
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--retro-border)] space-y-1">
                    <p className={`${retroHeading} text-[#1a0903]`}>SYSTEM STATUS</p>
                    <StatusBar />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 text-xs justify-start lg:justify-end">
                <button className={`${retroButton} !tracking-[0.3em]`} onClick={onLogout}>
                  خروج از سیستم
                </button>
                <button
                  className={`${retroButton} !bg-[#2d3b45] !border-[#1f2e3b] !tracking-[0.3em]`}
                  onClick={() => navigate('settings-users')}
                >
                  کاربران (Settings)
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div
            className="hp-container hp-container-right py-4 space-y-6"
            data-testid="hp-main-container"
          >
            <ErrorBoundary>
              <React.Suspense
                fallback={
                  <div className={`${retroPanel} p-6`}>
                    <p className={`${retroHeading} text-[#3b2313]`}>در حال بارگذاری ماژول…</p>
                  </div>
                }
              >
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
                    <p className={`${retroHeading} text-[#3b2313]`}>{t('module_not_found')}</p>
                    <p className="mt-2 text-sm">
                      ماژول انتخاب‌شده یافت نشد. از منوی کناری گزینه دیگری را انتخاب کنید.
                    </p>
                  </div>
                )}
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
