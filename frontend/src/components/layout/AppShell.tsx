import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { retroBadge, retroButton, retroHeading, retroPanel, retroMuted } from '../retroTheme'
import { useI18n } from '../../i18n/I18nContext'
import StatusBar from '../StatusBar'
import SidebarMenu from './SidebarMenu'
import type { SyncRecord } from '../../App'
import GlobalSearch from '../GlobalSearch'
import { formatNumberFa, toPersianDigits } from '../../utils/num'
import { useFY } from '../../context/FYContext'
import ErrorBoundary from '../ErrorBoundary'

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

export default function AppShell({ modules, sync, user, onLogout, orgFeatures, permissions }: AppShellProps) {
  const { t } = useI18n()
  const visibleModules = useMemo(() => {
    const allowAll = !!(user && (user.role === 'Admin' || /Developer/i.test(user.role)))
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
  const [sidebarSide] = useState<'left' | 'right'>(() => 'right')
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

  // سمت منو را همیشه راست ثبت می‌کنیم
  useEffect(() => {
    try {
      localStorage.setItem('hesabpak_sidebar_side_v1', 'right')
    } catch (e) {}
  }, [])

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
      className={`${'shrink-0'} ${sidebarSide === 'right' ? 'border-l-4' : 'border-r-4'} border-[#d7caa4] bg-[#111821] flex flex-col sticky top-0 h-screen z-20 overflow-hidden`}
      style={{ width: 'var(--hp-sidebar-width)' }}
    >
      <div className="p-4 border-b border-[#2d3b45] flex items-center justify-between gap-2">
        <div>
          <p className={`${retroHeading} text-[#d7caa4]`}>{t('app_name')}</p>
          <div>
            <h1 className="text-2xl font-semibold mt-2">کنسول کلاسیک</h1>
            <p className="text-xs text-[#aeb4b9] mt-3 leading-6">
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

      <div className="p-4 border-t border-[#2d3b45] space-y-3 text-xs">
        <div>
          <p className={`${retroHeading} text-[#d7caa4]`}>{t('smart_date')}</p>
          <p className="mt-1">{smartDate.jalali ? smartDate.jalali : 'تاریخ انتخاب نشده'}</p>
          {smartDate.isoDate && <p className="text-[#aeb4b9] mt-1">ISO: {smartDate.isoDate}</p>}
        </div>
        {sync && (
          <div>
            <p className={`${retroHeading} text-[#d7caa4]`}>SYNC</p>
            <p className="mt-1 text-[#aeb4b9] text-[11px] leading-5">
              UTC سرور: {sync.serverUtc.slice(0, 19).replace('T', ' ')}
            </p>
            <p className="text-[#aeb4b9] text-[11px] leading-5">
              اختلاف: {sync.serverOffsetSeconds}s
            </p>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#141d24] text-[#f5f1e6] flex flex-nowrap items-stretch">
      {sidebarSide === 'right' && asideElement}
      <div className="flex-1 min-w-0 flex flex-col bg-[#e9e4d8] text-[#2e2720]">
        <header className="border-b-2 border-[#d7caa4] bg-[#1f2e3b] text-[#f5f1e6]">
          <div className="hp-container py-5 flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className={`${retroHeading} text-[var(--retro-muted-text)]`}>
                  {t('active_module')}
                </p>
                <h2 className="text-3xl font-semibold mt-2">{activeModule?.label ?? '—'}</h2>
                <p className="text-sm text-[#c3bca5] mt-1 leading-6">{activeModule?.description}</p>
              </div>
              <div className="flex flex-col items-start lg:items-end text-sm gap-1">
                <span>کاربر: {user?.username ?? '---'}</span>
                <span>نقش دسترسی: {user?.role ?? '---'}</span>
                {/* FY selector removed from header per request */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`${retroBadge} bg-[#2d3b45] border-[#4b5f6f]`}>
                    {smartDate.jalali ? `Jalali: ${smartDate.jalali}` : 'JALALI TBD'}
                  </span>
                  <span className={`${retroBadge} bg-[#2d3b45] border-[#4b5f6f]`}>
                    {smartDate.isoDate ? `ISO: ${smartDate.isoDate}` : 'ISO TBD'}
                  </span>
                  {/* Active FY badge */}
                  <span className={`${retroBadge} bg-[#3a4a57] border-[#4b5f6f]`}>
                    {activeFy ? `سال مالی: ${activeFy.name ?? activeFy.id}` : 'سال مالی: نامشخص'}
                  </span>
                  <StatusBar />
                </div>
              </div>
            </div>
            <div className="mt-2">
              <GlobalSearch onNavigate={navigate} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className={`${retroPanel} px-4 py-3 text-xs space-y-1`}>
                <p className={`${retroHeading} text-[#7a6b4f]`}>SERVER TIME SNAPSHOT</p>
                <p>
                  {sync?.serverUtc
                    ? `UTC: ${toPersianDigits(sync.serverUtc.slice(0, 19).replace('T', ' '))}`
                    : 'در انتظار همگام‌سازی'}
                </p>
                {sync?.serverLocal && (
                  <p>LOC: {toPersianDigits(sync.serverLocal.slice(0, 19).replace('T', ' '))}</p>
                )}
                {sync?.jalali && <p>JALALI: {sync.jalali}</p>}
                <p className={`text-[#7a6b4f]`}>
                  اختلاف منطقه:{' '}
                  {toPersianDigits(sync?.serverOffset ?? `${sync?.serverOffsetSeconds ?? 0}s`)}
                </p>
                {clockDriftMs !== null && (
                  <p className={`text-[#7a6b4f]`}>
                    اختلاف ساعت با کلاینت: {formatNumberFa(clockDriftMs)} میلی‌ثانیه
                  </p>
                )}
                {sync?.latencyMs != null && (
                  <p className={`text-[#7a6b4f]`}>
                    تاخیر شبکه: {formatNumberFa(sync?.latencyMs ?? 0)} میلی‌ثانیه
                  </p>
                )}
              </div>
              <div className="flex sm:flex-row flex-col gap-2 text-xs">
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
        <main className="flex-1 overflow-y-auto">
          <div className="hp-container py-8 space-y-8">
            <ErrorBoundary>
              <React.Suspense
                fallback={
                  <div className={`${retroPanel} p-6`}>
                    <p className={`${retroHeading} text-[#7a6b4f]`}>در حال بارگذاری ماژول…</p>
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
                    <p className={`${retroHeading} text-[#7a6b4f]`}>{t('module_not_found')}</p>
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
      {sidebarSide === 'left' && asideElement}
    </div>
  )
}
