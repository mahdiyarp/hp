import {
  Activity,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  Gauge,
  Loader2,
  MemoryStick,
  Moon,
  Play,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Square,
  Sun,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import styles from './developer.module.css'
import type { CoreChecksLastSummary, CoreMissionAudit, CoreOperatorReadiness } from './page-core-queries-hook'

export type ThemeMode = 'dark' | 'light'

export type CoreStatus = {
  engine: string
  version: string
  status: string
  system: {
    uptime_seconds: number
    cpu_percent: number | null
    memory_percent: number | null
  }
  ollama: { available: boolean; models: string[] }
  assistant: { provider: string; model_name: string; enabled: boolean }
  ai_hp_bootstrap?: {
    running?: boolean
    ensured?: boolean
    model?: string
    last_attempt?: string | null
    last_success?: string | null
    last_error?: string | null
    message?: string | null
  }
  ts: string
}

export type Agent = {
  agent_id: string
  state: string
  is_running: boolean
  health?: string
  progress?: number
  current_task?: string
  uptime?: number
  errors?: number
}

export type ActivityItem = {
  kind: string
  title: string
  detail: string
  ts: string
}

export type Snapshot = {
  id: string
  label: string
  created_at: string
}

export type CoreModelsResponse = {
  ollama_available: boolean
  local: Array<{
    name: string
    provider: string
    size?: number | null
    modified_at?: string | null
    family?: string
    parameter_size?: string
    quantization?: string
  }>
  online: Array<{ name: string; provider: string; desc: string }>
  providers?: Record<string, { available?: boolean; detail?: string }>
  ai_hp_bootstrap?: {
    running?: boolean
    ensured?: boolean
    model?: string
    last_attempt?: string | null
    last_success?: string | null
    last_error?: string | null
    message?: string | null
  }
  recommended?: Array<{ name: string; provider: string; desc?: string }>
  smart_default?: { provider: string; model_name: string; reason?: string }
  active_provider: string
  active_model: string
}

export type TaskGraph = {
  nodes: Array<{ id: string; label: string; done?: boolean; active?: boolean }>
  edges: Array<{ from: string; to: string }>
  progress: number
  current_task: string | null
}

export type SelfCompletionStatus = {
  auto_loop_active?: boolean
  interval_minutes?: number
  current_task?: string | null
  progress?: number
  tasks_completed?: number
  tasks_total?: number
  bottlenecks?: Array<{ title?: string; detail?: string; severity?: string }>
  optimizations?: Array<{ title?: string; detail?: string }>
}

export type CoreFailoverStatus = {
  online_healthy: boolean
  failover_active: boolean
  current_provider: string
  current_model: string
  original_provider?: string | null
  original_model?: string | null
  last_check?: string | null
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} ثانیه`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h} ساعت و ${m} دقیقه`
}

export function formatClock(ts: string): string {
  return new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function cardBase(theme: ThemeMode): string {
  return `${styles.card} ${theme === 'dark' ? styles.cardDark : styles.cardLight}`
}

export function muted(theme: ThemeMode): string {
  return theme === 'dark' ? 'text-slate-300/90' : 'text-slate-600'
}

export function panel(theme: ThemeMode): string {
  return `${styles.panel} ${theme === 'dark' ? styles.panelDark : styles.panelLight}`
}

export function bubbleClass(theme: ThemeMode, role: 'user' | 'assistant'): string {
  if (role === 'user') {
    return theme === 'dark'
      ? 'bg-blue-500/25 text-blue-100 border border-blue-400/30'
      : 'bg-blue-100 text-blue-900 border border-blue-200'
  }
  return theme === 'dark'
    ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/25'
    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
}

function resolveHealthTone(healthScore: number): string {
  if (healthScore >= 80) return 'bg-emerald-600'
  if (healthScore >= 55) return 'bg-amber-600'
  return 'bg-rose-600'
}

function resolveReadinessToneClass(score?: number): string {
  if (typeof score !== 'number') return ''
  if (score >= 80) return 'text-emerald-300'
  if (score >= 55) return 'text-amber-300'
  return 'text-rose-300'
}

function normalizeReadinessScore(score?: number): number | undefined {
  if (typeof score !== 'number' || Number.isNaN(score)) return undefined
  const rounded = Math.round(score)
  return Math.max(0, Math.min(100, rounded))
}

function resolveLastChecksStatusText(checksLastData?: CoreChecksLastSummary): string {
  if (!checksLastData?.summary) return 'نامشخص'
  return checksLastData.summary.all_ok ? 'PASS' : 'FAIL'
}

function resolveChecksMeta(checksLastData?: CoreChecksLastSummary): {
  passedCount: number
  failedCount: number
  failedPreview: string
  hasItems: boolean
} {
  const checkItems = checksLastData?.summary?.checks ?? []
  const passedCount = checkItems.filter((item) => item?.ok).length
  const failedChecks = checkItems.filter((item) => !item?.ok)
  const failedCount = failedChecks.length
  const failedPreview = failedChecks
    .map((item) => item?.name || 'unknown')
    .slice(0, 2)
    .join('، ')

  return {
    passedCount,
    failedCount,
    failedPreview,
    hasItems: checkItems.length > 0,
  }
}

function renderNodeStateBadge(node: { done?: boolean; active?: boolean }) {
  if (node.active) return <Badge className="bg-blue-600">در حال اجرا</Badge>
  if (node.done) return <Badge className="bg-emerald-600">تمام</Badge>
  return <Badge className="bg-slate-600">در صف</Badge>
}

type CopyState = 'idle' | 'done' | 'failed'

function resolveCopyButtonLabel(copyState: CopyState): string {
  if (copyState === 'done') return 'آدرس کپی شد'
  if (copyState === 'failed') return 'کپی ناموفق'
  return 'کپی آدرس داشبورد'
}

function resolveGuideCopyButtonLabel(copyState: CopyState): string {
  if (copyState === 'done') return 'نام فایل کپی شد'
  if (copyState === 'failed') return 'کپی ناموفق'
  return 'کپی نام فایل راهنما'
}

function resolveChecklistCopyButtonLabel(copyState: CopyState): string {
  if (copyState === 'done') return 'چک لیست کپی شد'
  if (copyState === 'failed') return 'کپی ناموفق'
  return 'کپی کل چک لیست'
}

function resolveCrisisCopyButtonLabel(copyState: CopyState): string {
  if (copyState === 'done') return 'مراحل بحران کپی شد'
  if (copyState === 'failed') return 'کپی ناموفق'
  return 'کپی فقط مراحل بحران (4 مرحله)'
}

function resolveCopyToneClass(copyState: CopyState): string {
  if (copyState === 'done') return 'border-emerald-300/60 bg-emerald-500/20 text-emerald-100'
  if (copyState === 'failed') return 'border-rose-300/60 bg-rose-500/20 text-rose-100'
  return ''
}

function resolveCopyStateIcon(copyState: CopyState): string {
  if (copyState === 'done') return '✓'
  if (copyState === 'failed') return '!'
  return '⎘'
}

function isCoreStatusStale(status?: CoreStatus): boolean {
  if (!status?.ts) return false
  const tsMs = new Date(status.ts).getTime()
  if (!Number.isFinite(tsMs)) return false
  return Date.now() - tsMs > 60_000
}

function resolveOperatorStatusBadge(status?: CoreStatus): { label: string; className: string; stale: boolean } {
  const stale = isCoreStatusStale(status)

  if (status?.status === 'online' && stale) {
    return {
      label: 'Core: آنلاین (قدیمی)',
      className: 'border-amber-300/40 bg-amber-500/20 text-amber-100',
      stale: true,
    }
  }

  if (status?.status === 'online') {
    return {
      label: 'Core: آنلاین',
      className: 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100',
      stale: false,
    }
  }

  return {
    label: 'Core: آفلاین',
    className: 'border-rose-300/40 bg-rose-500/20 text-rose-100',
    stale: false,
  }
}

type HeaderProps = {
  theme: ThemeMode
  status?: CoreStatus
  wsConnected: boolean
  statusLoading: boolean
  onToggleTheme: () => void
  onRefresh: () => void
}

export function HeaderCard({ theme, status, wsConnected, statusLoading, onToggleTheme, onRefresh }: Readonly<HeaderProps>) {
  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${cardBase(theme)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500 p-2.5 text-white shadow">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">داشبورد هسته هوشمند حساب پاک</h1>
            <p className={`text-xs ${muted(theme)}`}>
              AI HP Core v{status?.version || '1.0.0'} • ارتباط زنده: {wsConnected ? 'فعال' : 'در حال اتصال'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={status?.status === 'online' ? 'bg-emerald-600' : 'bg-red-600'}>
            {status?.status === 'online' ? 'هسته آنلاین' : 'هسته آفلاین'}
          </Badge>
          <Badge className={`${wsConnected ? 'bg-blue-600' : 'bg-slate-600'} ${wsConnected ? styles.pulse : ''}`}>
            {wsConnected ? 'وب سوکت زنده' : 'وب سوکت قطع'}
          </Badge>
          <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={onRefresh}>
            <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}

type DeveloperTopDisplaySectionProps = {
  viewModeBannerProps: {
    badgeClass: string
    label: string
    descriptionClass: string
    buttonConfigs: Array<{ mode: 'simple' | 'advanced'; label: string; variant: 'default' | 'outline' }>
  }
  onSetViewMode: (mode: 'simple' | 'advanced') => void
  simpleHintDisplayItems: Array<{ id: string; text: string; className: string }>
  summaryTileDisplayItems: Array<{ id: string; label: string; value: number; toneClass: string }>
  status?: CoreStatus
  onRefreshStatus?: () => void
  refreshPending?: boolean
}

export function DeveloperTopDisplaySection({
  viewModeBannerProps,
  onSetViewMode,
  simpleHintDisplayItems,
  summaryTileDisplayItems,
  status,
  onRefreshStatus,
  refreshPending = false,
}: Readonly<DeveloperTopDisplaySectionProps>) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [guideCopyState, setGuideCopyState] = useState<CopyState>('idle')
  const [showOnePageGuide, setShowOnePageGuide] = useState(false)
  const [checklistCopyState, setChecklistCopyState] = useState<CopyState>('idle')
  const [crisisCopyState, setCrisisCopyState] = useState<CopyState>('idle')
  const coreOnline = status?.status === 'online'
  const copyButtonLabel = resolveCopyButtonLabel(copyState)
  const guideCopyButtonLabel = resolveGuideCopyButtonLabel(guideCopyState)
  const checklistCopyButtonLabel = resolveChecklistCopyButtonLabel(checklistCopyState)
  const crisisCopyButtonLabel = resolveCrisisCopyButtonLabel(crisisCopyState)
  const operatorStatusBadge = resolveOperatorStatusBadge(status)
  const lastStatusUpdateText = status?.ts ? formatClock(status.ts) : '---'
  const copyButtonToneClass = resolveCopyToneClass(copyState)
  const guideCopyButtonToneClass = resolveCopyToneClass(guideCopyState)
  const checklistCopyButtonToneClass = resolveCopyToneClass(checklistCopyState)
  const crisisCopyButtonToneClass = resolveCopyToneClass(crisisCopyState)
  const copyButtonIcon = resolveCopyStateIcon(copyState)
  const guideCopyButtonIcon = resolveCopyStateIcon(guideCopyState)
  const checklistCopyButtonIcon = resolveCopyStateIcon(checklistCopyState)
  const crisisCopyButtonIcon = resolveCopyStateIcon(crisisCopyState)
  const hasClipboardFailure =
    copyState === 'failed' ||
    guideCopyState === 'failed' ||
    checklistCopyState === 'failed' ||
    crisisCopyState === 'failed'

  const onePageChecklistText = [
    '1) بار اول: install.bat',
    '2) اجرای روزانه: start.bat',
    '3) توقف امن: stop.bat',
    '4) صفحه اصلی: http://localhost:8880',
    '5) داشبورد کنترل: http://localhost:8880/developer',
    '6) اگر badge زرد بود: بروزرسانی وضعیت',
    '7) اگر زرد ماند: stop.bat سپس start.bat',
    '8) اگر Core آفلاین شد: stop.bat سپس start.bat',
    '9) معیار سلامت: Core آنلاین + Mission 6/6',
    '10) کار ممنوع: ویرایش کد یا دستور دستی',
  ].join('\n')

  const crisisChecklistText = [
    '1) Core را در /developer چک کن.',
    '2) اگر Core زرد بود: بروزرسانی وضعیت را یک بار بزن.',
    '3) اگر هنوز زرد/آفلاین بود: stop.bat سپس start.bat.',
    '4) دوباره /developer را باز کن و Mission 6/6 را تایید کن.',
  ].join('\n')

  async function handleCopyDeveloperUrl() {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setCopyState('failed')
        return
      }
      await navigator.clipboard.writeText('http://localhost:8880/developer')
      setCopyState('done')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('failed')
    }
  }

  async function handleCopyOnePageGuideName() {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setGuideCopyState('failed')
        return
      }
      await navigator.clipboard.writeText('OPERATOR_ONE_PAGE_FA.md')
      setGuideCopyState('done')
      setTimeout(() => setGuideCopyState('idle'), 2000)
    } catch {
      setGuideCopyState('failed')
    }
  }

  async function handleCopyOnePageChecklist() {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setChecklistCopyState('failed')
        return
      }
      await navigator.clipboard.writeText(onePageChecklistText)
      setChecklistCopyState('done')
      setTimeout(() => setChecklistCopyState('idle'), 2000)
    } catch {
      setChecklistCopyState('failed')
    }
  }

  async function handleCopyCrisisChecklist() {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setCrisisCopyState('failed')
        return
      }
      await navigator.clipboard.writeText(crisisChecklistText)
      setCrisisCopyState('done')
      setTimeout(() => setCrisisCopyState('idle'), 2000)
    } catch {
      setCrisisCopyState('failed')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-400/30 bg-slate-500/10 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Badge className={viewModeBannerProps.badgeClass}>حالت {viewModeBannerProps.label}</Badge>
          <span className={viewModeBannerProps.descriptionClass}>این داشبورد برای استفاده بدون کدنویسی طراحی شده است.</span>
        </div>
        <div className="flex items-center gap-2">
          {viewModeBannerProps.buttonConfigs.map((config) => (
            <Button key={config.mode} size="sm" variant={config.variant} onClick={() => onSetViewMode(config.mode)}>
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-emerald-200">مسیر سریع اپراتور (بدون کدنویسی)</p>
            <span
              data-testid="operator-core-status-badge"
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${operatorStatusBadge.className}`}
            >
              {operatorStatusBadge.label}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={`h-7 text-[11px] ${copyButtonToneClass}`}
            onClick={handleCopyDeveloperUrl}
          >
            <span aria-hidden="true" className="ml-1">{copyButtonIcon}</span>
            {copyButtonLabel}
          </Button>
        </div>
        <p className="mt-1 text-slate-200/90">فقط از این 3 فایل استفاده کن: `install.bat`، `start.bat`، `stop.bat`</p>
        <p className="mt-1 text-[11px] text-slate-300/90">آخرین بروزرسانی: {lastStatusUpdateText}</p>
        {operatorStatusBadge.stale ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-amber-200">داده Core قدیمی است. یک بار دکمه Refresh را بزن.</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={onRefreshStatus}
              disabled={!onRefreshStatus || refreshPending}
            >
              {refreshPending ? 'در حال بروزرسانی...' : 'بروزرسانی وضعیت'}
            </Button>
          </div>
        ) : null}
        <p className="mt-1 text-[11px] text-slate-200/90">
          {coreOnline
            ? 'وضعیت هسته آنلاین است. برای کار روزانه، فقط چک سریع سیستم را اجرا کن.'
            : 'هسته آفلاین است: اول `stop.bat` را بزن، 5 ثانیه صبر کن، سپس `start.bat` را اجرا کن.'}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-300/30 px-2 py-1.5">1) `install.bat` برای نصب اولیه</div>
          <div className="rounded-lg border border-emerald-300/30 px-2 py-1.5">2) `start.bat` برای اجرای کامل</div>
          <div className="rounded-lg border border-emerald-300/30 px-2 py-1.5">3) `stop.bat` برای توقف امن</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-slate-300/90">راهنمای خیلی کوتاه: `OPERATOR_ONE_PAGE_FA.md`</p>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={() => setShowOnePageGuide((prev) => !prev)}
          >
            {showOnePageGuide ? 'بستن راهنمای یک صفحه' : 'نمایش راهنمای یک صفحه'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`h-6 px-2 text-[10px] ${guideCopyButtonToneClass}`}
            onClick={handleCopyOnePageGuideName}
          >
            <span aria-hidden="true" className="ml-1">{guideCopyButtonIcon}</span>
            {guideCopyButtonLabel}
          </Button>
        </div>
        {hasClipboardFailure ? (
          <output className="mt-1 block text-[11px] text-rose-200">
            کپی ناموفق بود. مجوز Clipboard مرورگر را فعال کن یا نام فایل را دستی بردار.
          </output>
        ) : null}
        {showOnePageGuide ? (
          <div className="mt-2 rounded-lg border border-slate-300/30 bg-slate-600/20 px-2 py-2 text-[11px] leading-6 text-slate-100">
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`h-6 px-2 text-[10px] ${checklistCopyButtonToneClass}`}
                onClick={handleCopyOnePageChecklist}
              >
                <span aria-hidden="true" className="ml-1">{checklistCopyButtonIcon}</span>
                {checklistCopyButtonLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`h-6 px-2 text-[10px] ${crisisCopyButtonToneClass}`}
                onClick={handleCopyCrisisChecklist}
              >
                <span aria-hidden="true" className="ml-1">{crisisCopyButtonIcon}</span>
                {crisisCopyButtonLabel}
              </Button>
            </div>
            <p>1) بار اول: `install.bat`</p>
            <p>2) اجرای روزانه: `start.bat`</p>
            <p>3) توقف امن: `stop.bat`</p>
            <p>4) صفحه اصلی: `http://localhost:8880`</p>
            <p>5) داشبورد کنترل: `http://localhost:8880/developer`</p>
            <p>6) اگر badge زرد بود: `بروزرسانی وضعیت`</p>
            <p>7) اگر زرد ماند: `stop.bat` سپس `start.bat`</p>
            <p>8) اگر `Core: آفلاین` شد: `stop.bat` سپس `start.bat`</p>
            <p>9) معیار سلامت: `Core آنلاین` + `Mission 6/6`</p>
            <p>10) کار ممنوع: ویرایش کد یا دستور دستی</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {simpleHintDisplayItems.map((hint) => (
          <div key={hint.id} className={`rounded-lg border px-3 py-2 text-xs ${hint.className}`}>
            {hint.text}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {summaryTileDisplayItems.map((tile) => (
          <div key={tile.id} className={`rounded-lg border px-3 py-2 text-xs ${tile.toneClass}`}>
            {tile.label}: {tile.value}
          </div>
        ))}
      </div>
    </>
  )
}

type DeveloperDashboardColumnsSectionProps = {
  gridClassName: string
  columns: Array<Array<{ id: string; node: ReactNode }>>
}

export function DeveloperDashboardColumnsSection({
  gridClassName,
  columns,
}: Readonly<DeveloperDashboardColumnsSectionProps>) {
  return (
    <div className={gridClassName}>
      {columns.map((column) => (
        <div key={`dashboard-column-${column.map((item) => item.id).join('-')}`} className="space-y-3">
          {column.map((item) => (
            <div key={item.id}>{item.node}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

type SmartControlCenterProps = {
  theme: ThemeMode
  wsConnected: boolean
  healthScore: number
  status?: CoreStatus
  selfCompletionData?: SelfCompletionStatus
  checksLastData?: CoreChecksLastSummary
  missionAuditData?: CoreMissionAudit
  operatorReadinessData?: CoreOperatorReadiness
  aiHpBootstrapPending: boolean
  onRunSelfCompletion: () => void
  onSwitchRecommendedModel: () => void
  onCreateSnapshot: () => void
  onQuickStabilize: () => void
  onRunChecks: () => void
  onRunDeepChecks: () => void
  onRunAiHpBootstrap: () => void
  onOpenAdvanced: () => void
  pending: {
    selfCompletion: boolean
    modelSwitch: boolean
    snapshot: boolean
    stabilize: boolean
    checks: boolean
  }
}

type SmartActionButtonProps = {
  onClick: () => void
  disabled: boolean
  label: string
  variant?: 'default' | 'outline'
  pending: boolean
  pendingIcon: ReactNode
  idleIcon: ReactNode
}

function SmartActionButton({
  onClick,
  disabled,
  label,
  variant = 'outline',
  pending,
  pendingIcon,
  idleIcon,
}: Readonly<SmartActionButtonProps>) {
  return (
    <Button onClick={onClick} disabled={disabled} variant={variant} className="justify-start">
      {pending ? pendingIcon : idleIcon}
      {label}
    </Button>
  )
}

export function SmartControlCenterCard({
  theme,
  wsConnected,
  healthScore,
  status,
  selfCompletionData,
  checksLastData,
  missionAuditData,
  operatorReadinessData,
  aiHpBootstrapPending,
  onRunSelfCompletion,
  onSwitchRecommendedModel,
  onCreateSnapshot,
  onQuickStabilize,
  onRunChecks,
  onRunDeepChecks,
  onRunAiHpBootstrap,
  onOpenAdvanced,
  pending,
}: Readonly<SmartControlCenterProps>) {
  const healthTone = resolveHealthTone(healthScore)
  const lastChecksStatusText = resolveLastChecksStatusText(checksLastData)
  const checksMeta = resolveChecksMeta(checksLastData)
  const missionDoneCount = missionAuditData?.done_count ?? 0
  const missionTotal = missionAuditData?.total ?? 0
  const missionAllDone = missionAuditData?.all_done ?? (missionTotal > 0 && missionDoneCount === missionTotal)
  const missionStatusText = missionAllDone ? 'کامل' : 'در حال انجام'
  const readinessDoneCount = operatorReadinessData?.done_count ?? missionDoneCount
  const readinessTotal = operatorReadinessData?.total ?? missionTotal
  const readinessStatusFa = operatorReadinessData?.status_fa ?? missionStatusText
  const readinessScore = normalizeReadinessScore(operatorReadinessData?.score)
  const readinessToneClass = resolveReadinessToneClass(readinessScore)
  const readinessSummaryText =
    readinessTotal > 0 ? `${readinessDoneCount}/${readinessTotal} (${readinessStatusFa})` : 'در حال بارگذاری'
  const firstMissingMission = missionAuditData?.capabilities?.find((item) => !item.done)?.title
  const nextActionText = operatorReadinessData?.next_action || firstMissingMission || null

  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-yellow-500" />
          مرکز کنترل هوشمند
          <Badge className={`mr-auto ${healthTone}`}>امتیاز سلامت: {healthScore}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className={`rounded border p-3 ${panel(theme)}`}>
          <p className="font-semibold">راهنمای سریع برای کاربر غیر فنی</p>
          <p className={muted(theme)}>
            برای پایدار نگه داشتن سیستم، فقط از دکمه های پایین استفاده کنید. بقیه تنظیمات در حالت پیشرفته است.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <span className={muted(theme)}>وضعیت هسته: {status?.status === 'online' ? 'آنلاین' : 'آفلاین'}</span>
            <span className={muted(theme)}>ارتباط زنده: {wsConnected ? 'فعال' : 'قطع'}</span>
            <span className={muted(theme)}>مدل فعال: {status?.assistant?.model_name || 'نامشخص'}</span>
            <span className={muted(theme)}>چرخه خودکار: {selfCompletionData?.auto_loop_active ? 'فعال' : 'غیرفعال'}</span>
            <span className={muted(theme)}>
              آخرین چک: {lastChecksStatusText}
            </span>
          </div>
          <div className="mt-2 text-[11px]">
            <span className={muted(theme)}>
              زمان آخرین چک: {checksLastData?.summary?.timestamp ? formatClock(checksLastData.summary.timestamp) : '---'}
            </span>
          </div>
          <div className="mt-1 text-[11px]">
            <span className={muted(theme)}>
              آمادگی اپراتور: {readinessSummaryText}
            </span>
          </div>
          {typeof readinessScore === 'number' ? (
            <div className="mt-1 text-[11px]">
              <span data-testid="operator-readiness-score" className={`${muted(theme)} ${readinessToneClass}`}>
                امتیاز آمادگی: {readinessScore}
              </span>
            </div>
          ) : null}
          {operatorReadinessData?.summary ? (
            <div className="mt-1 text-[11px]">
              <span className={muted(theme)}>خلاصه وضعیت: {operatorReadinessData.summary}</span>
            </div>
          ) : null}
          {nextActionText ? (
            <div className="mt-1 text-[11px]">
              <span className={muted(theme)}>اقدام بعدی: {nextActionText}</span>
            </div>
          ) : null}
          {checksMeta.hasItems ? (
            <div className="mt-1 text-[11px]">
              <span className={muted(theme)}>
                نتیجه جزئی: پاس {checksMeta.passedCount} / خطا {checksMeta.failedCount}
                {checksMeta.failedCount > 0 && checksMeta.failedPreview ? ` (خطا: ${checksMeta.failedPreview})` : ''}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SmartActionButton
            onClick={onRunSelfCompletion}
            disabled={pending.selfCompletion}
            variant="default"
            label="بررسی و بهبود خودکار سیستم"
            pending={pending.selfCompletion}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<Play className="ml-1 h-4 w-4" />}
          />

          <SmartActionButton
            onClick={onQuickStabilize}
            disabled={pending.stabilize}
            label="پایدارسازی سریع سرویس ها"
            pending={pending.stabilize}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<Shield className="ml-1 h-4 w-4" />}
          />

          <SmartActionButton
            onClick={onRunChecks}
            disabled={pending.checks}
            label="اجرای چک سریع سیستم"
            pending={pending.checks}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<CheckCircle className="ml-1 h-4 w-4" />}
          />

          <SmartActionButton
            onClick={onRunDeepChecks}
            disabled={pending.checks}
            label="اجرای چک عمیق سیستم"
            pending={pending.checks}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<Shield className="ml-1 h-4 w-4" />}
          />

          <SmartActionButton
            onClick={onSwitchRecommendedModel}
            disabled={pending.modelSwitch}
            label="تنظیم مدل پیشنهادی (سریع)"
            pending={pending.modelSwitch}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<Cpu className="ml-1 h-4 w-4" />}
          />

          <SmartActionButton
            onClick={onRunAiHpBootstrap}
            disabled={aiHpBootstrapPending}
            label="آماده سازی مدل پایه ai_hp"
            pending={aiHpBootstrapPending}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<Play className="ml-1 h-4 w-4" />}
          />

          <SmartActionButton
            onClick={onCreateSnapshot}
            disabled={pending.snapshot}
            label="ذخیره وضعیت فعلی (Snapshot)"
            pending={pending.snapshot}
            pendingIcon={<Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            idleIcon={<Database className="ml-1 h-4 w-4" />}
          />
        </div>

        <Button variant="ghost" className="w-full" onClick={onOpenAdvanced}>
          <Settings className="ml-1 h-4 w-4" />
          باز کردن حالت پیشرفته داشبورد
        </Button>
      </CardContent>
    </Card>
  )
}

type CoreStatusProps = {
  theme: ThemeMode
  status?: CoreStatus
}

export function CoreStatusCard({ theme, status }: Readonly<CoreStatusProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4 text-cyan-500" />
          وضعیت هسته
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className={`rounded-lg border p-2 ${panel(theme)}`}>
          <div className="flex items-center justify-between">
            <span className={muted(theme)}>مدل فعال</span>
            <Badge className="bg-emerald-600">{status?.assistant?.provider || '...'}</Badge>
          </div>
          <p className="mt-1 font-mono text-emerald-500">{status?.assistant?.model_name || '...'}</p>
        </div>
        <div className="space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className={muted(theme)}>CPU</span>
              <span>{(status?.system?.cpu_percent || 0).toFixed(1)}%</span>
            </div>
            <progress
              className="h-2 w-full overflow-hidden rounded [&::-webkit-progress-bar]:bg-slate-300/50 [&::-webkit-progress-value]:bg-blue-500"
              max={100}
              value={Math.min(status?.system?.cpu_percent || 0, 100)}
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className={muted(theme)}>RAM</span>
              <span>{(status?.system?.memory_percent || 0).toFixed(1)}%</span>
            </div>
            <progress
              className="h-2 w-full overflow-hidden rounded [&::-webkit-progress-bar]:bg-slate-300/50 [&::-webkit-progress-value]:bg-fuchsia-500"
              max={100}
              value={Math.min(status?.system?.memory_percent || 0, 100)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={muted(theme)}>آپتایم</span>
          <span>{status?.system ? formatUptime(status.system.uptime_seconds) : '...'}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={muted(theme)}>وضعیت Ollama</span>
          <span className={status?.ollama?.available ? 'text-emerald-500' : 'text-red-500'}>
            {status?.ollama?.available ? 'متصل' : 'غیرمتصل'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

type ModelSelectionProps = {
  theme: ThemeMode
  status?: CoreStatus
  modelsData?: CoreModelsResponse
  failoverStatus?: CoreFailoverStatus
  preferredLocalModels: string[]
  allLocalModels: string[]
  activeModel: { provider: string; model_name: string } | null
  activating: boolean
  aiHpBootstrapPending: boolean
  failoverCheckPending: boolean
  onRunAiHpBootstrap: () => void
  onRunFailoverCheck: () => void
  onSwitchModel: (provider: string, model_name: string) => void
}

type InlineStatusButtonProps = {
  onClick: () => void
  disabled: boolean
  label: string
  pending: boolean
  pendingIcon: ReactNode
  idleIcon: ReactNode
}

function InlineStatusButton({
  onClick,
  disabled,
  label,
  pending,
  pendingIcon,
  idleIcon,
}: Readonly<InlineStatusButtonProps>) {
  return (
    <Button variant="outline" className="mt-2 h-8 w-full justify-between" onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      {pending ? pendingIcon : idleIcon}
    </Button>
  )
}

type ModelSwitchButtonProps = {
  label: ReactNode
  onClick: () => void
  disabled: boolean
  isActive: boolean
}

function ModelSwitchButton({ label, onClick, disabled, isActive }: Readonly<ModelSwitchButtonProps>) {
  return (
    <Button variant="outline" className="h-8 justify-between" onClick={onClick} disabled={disabled}>
      <span className="truncate">{label}</span>
      {isActive ? <CheckCircle className="h-3 w-3" /> : null}
    </Button>
  )
}

function ModelSelectionHeaderIcon({ ollamaAvailable }: Readonly<{ ollamaAvailable?: boolean }>) {
  if (ollamaAvailable) return <Wifi className="h-4 w-4 text-emerald-500" />
  return <WifiOff className="h-4 w-4 text-red-500" />
}

function ProviderAvailabilityContent({
  providerEntries,
  theme,
}: Readonly<{ providerEntries: Array<[string, { available?: boolean; detail?: string }]>; theme: ThemeMode }>) {
  if (providerEntries.length === 0) {
    return <p className={`mt-1 ${muted(theme)}`}>وضعیت providerها در دسترس نیست.</p>
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {providerEntries.map(([provider, info]) => (
        <Badge key={provider} className={info?.available ? 'bg-emerald-600' : 'bg-slate-600'}>
          {provider}: {info?.available ? 'ON' : 'OFF'}
        </Badge>
      ))}
    </div>
  )
}

export function ModelSelectionCard({
  theme,
  status,
  modelsData,
  failoverStatus,
  preferredLocalModels,
  allLocalModels,
  activeModel,
  activating,
  aiHpBootstrapPending,
  failoverCheckPending,
  onRunAiHpBootstrap,
  onRunFailoverCheck,
  onSwitchModel,
}: Readonly<ModelSelectionProps>) {
  const providerEntries = Object.entries(modelsData?.providers || {})
  const aiHpBootstrap = modelsData?.ai_hp_bootstrap || status?.ai_hp_bootstrap
  const canRestoreOriginalOnlineModel =
    Boolean(failoverStatus?.failover_active) &&
    Boolean(failoverStatus?.original_provider) &&
    Boolean(failoverStatus?.original_model)

  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ModelSelectionHeaderIcon ollamaAvailable={status?.ollama?.available} />
          انتخاب مدل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>وضعیت Providerها</p>
          <ProviderAvailabilityContent providerEntries={providerEntries} theme={theme} />
        </div>

        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>وضعیت Failover</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge className={failoverStatus?.online_healthy ? 'bg-emerald-600' : 'bg-rose-600'}>
              آنلاین: {failoverStatus?.online_healthy ? 'سالم' : 'ناسالم'}
            </Badge>
            <Badge className={failoverStatus?.failover_active ? 'bg-amber-600' : 'bg-slate-600'}>
              failover: {failoverStatus?.failover_active ? 'فعال' : 'غیرفعال'}
            </Badge>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-[11px]">
            <span className={muted(theme)}>سلامت آنلاین: {failoverStatus?.online_healthy ? 'سالم' : 'ناسالم'}</span>
            <span className={muted(theme)}>حالت failover: {failoverStatus?.failover_active ? 'فعال' : 'غیرفعال'}</span>
            <span className={muted(theme)}>مدل فعلی: {failoverStatus?.current_provider || '---'} / {failoverStatus?.current_model || '---'}</span>
            <span className={muted(theme)}>
              مدل اصلی: {failoverStatus?.original_provider || '---'} / {failoverStatus?.original_model || '---'}
            </span>
          </div>
          <InlineStatusButton
            onClick={onRunFailoverCheck}
            disabled={activating || failoverCheckPending}
            label="Health Re-check مدل آنلاین"
            pending={failoverCheckPending}
            pendingIcon={<Loader2 className="h-3 w-3 animate-spin" />}
            idleIcon={<Shield className="h-3 w-3" />}
          />
          {canRestoreOriginalOnlineModel ? (
            <InlineStatusButton
              onClick={() => onSwitchModel(String(failoverStatus?.original_provider), String(failoverStatus?.original_model))}
              disabled={activating}
              label="بازگردانی مدل آنلاین اصلی"
              pending={activating}
              pendingIcon={<Loader2 className="h-3 w-3 animate-spin" />}
              idleIcon={<RefreshCw className="h-3 w-3" />}
            />
          ) : null}
        </div>

        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>وضعیت ai_hp Base Model</p>
          <div className="mt-1 grid grid-cols-1 gap-1 text-[11px]">
            <span className={muted(theme)}>مدل پایه: {aiHpBootstrap?.model || 'qwen3.5:9b'}</span>
            <span className={muted(theme)}>وضعیت: {aiHpBootstrap?.ensured ? 'آماده' : 'نیازمند bootstrap'}</span>
            <span className={muted(theme)}>اجرا: {aiHpBootstrap?.running ? 'در حال اجرا' : 'آزاد'}</span>
          </div>
          <InlineStatusButton
            onClick={onRunAiHpBootstrap}
            disabled={activating || aiHpBootstrapPending || aiHpBootstrap?.running}
            label="اجرای bootstrap مدل پایه ai_hp"
            pending={Boolean(aiHpBootstrapPending || aiHpBootstrap?.running)}
            pendingIcon={<Loader2 className="h-3 w-3 animate-spin" />}
            idleIcon={<Play className="h-3 w-3" />}
          />
        </div>

        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>پیشنهادی هسته</p>
          <ModelSwitchButton
            label="ai_hp / qwen3.5:9b"
            onClick={() => onSwitchModel('ai_hp', 'qwen3.5:9b')}
            disabled={activating}
            isActive={activeModel?.provider === 'ai_hp'}
          />
        </div>

        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>مدل های Local پیشنهادی (Ollama)</p>
          <div className="mt-2 grid gap-1">
            {preferredLocalModels.length === 0 ? (
              <p className={muted(theme)}>مدل محلی شناخته شده پیدا نشد.</p>
            ) : (
              preferredLocalModels.map((name) => (
                <ModelSwitchButton
                  key={name}
                  label={name}
                  onClick={() => onSwitchModel('ollama', name)}
                  disabled={activating}
                  isActive={activeModel?.model_name === name}
                />
              ))
            )}
          </div>
        </div>

        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>تمام مدل های Local نصب شده</p>
          <div className="mt-2 grid gap-1">
            {allLocalModels.length === 0 ? (
              <p className={muted(theme)}>هیچ مدل محلی نصب شده یافت نشد.</p>
            ) : (
              allLocalModels.slice(0, 12).map((name) => (
                <ModelSwitchButton
                  key={`installed-${name}`}
                  label={name}
                  onClick={() => onSwitchModel('ollama', name)}
                  disabled={activating}
                  isActive={activeModel?.provider === 'ollama' && activeModel?.model_name === name}
                />
              ))
            )}
          </div>
          {allLocalModels.length > 12 ? (
            <p className={`mt-1 text-[11px] ${muted(theme)}`}>فقط 12 مدل اول نمایش داده می شود. مجموع: {allLocalModels.length}</p>
          ) : null}
        </div>

        {modelsData?.recommended && modelsData.recommended.length > 0 ? (
          <div className={`rounded border p-2 ${panel(theme)}`}>
            <p className={muted(theme)}>پیشنهادهای تکمیلی هسته</p>
            <div className="mt-2 grid gap-1">
              {modelsData.recommended.slice(0, 4).map((m) => (
                <ModelSwitchButton
                  key={`recommended-${m.provider}-${m.name}`}
                  label={`${m.provider} / ${m.name}`}
                  onClick={() => onSwitchModel(m.provider, m.name)}
                  disabled={activating}
                  isActive={activeModel?.provider === m.provider && activeModel?.model_name === m.name}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className={muted(theme)}>مدل های آنلاین خودکار</p>
          <div className="mt-2 grid gap-1">
            {(modelsData?.online || []).slice(0, 3).map((m) => (
              <ModelSwitchButton
                key={`${m.provider}-${m.name}`}
                label={`${m.provider} / ${m.name}`}
                onClick={() => onSwitchModel(m.provider, m.name)}
                disabled={activating}
                isActive={activeModel?.provider === m.provider && activeModel?.model_name === m.name}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type SelfCompletionCardProps = {
  theme: ThemeMode
  selfCompletionData?: SelfCompletionStatus
  pending: boolean
  onRun: () => void
}

export function SelfCompletionCard({ theme, selfCompletionData, pending, onRun }: Readonly<SelfCompletionCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-yellow-500" />
          خودتکمیل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className={muted(theme)}>حلقه خودکار</span>
          <Badge className={selfCompletionData?.auto_loop_active ? 'bg-emerald-600' : 'bg-slate-600'}>
            {selfCompletionData?.auto_loop_active ? 'فعال' : 'غیرفعال'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className={muted(theme)}>فاصله اجرا</span>
          <span>{selfCompletionData?.interval_minutes || 30} دقیقه</span>
        </div>
        <progress
          className="h-2 w-full overflow-hidden rounded [&::-webkit-progress-bar]:bg-slate-300/50 [&::-webkit-progress-value]:bg-yellow-500"
          max={100}
          value={Math.max(0, Math.min(Number(selfCompletionData?.progress || 0), 100))}
        />
        <div className="flex items-center justify-between">
          <span className={muted(theme)}>تسک جاری</span>
          <span className="truncate">{selfCompletionData?.current_task || 'ندارد'}</span>
        </div>
        <Button className="w-full" onClick={onRun} disabled={pending}>
          {pending ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Play className="ml-1 h-4 w-4" />}
          اجرای چرخه خودتکمیل
        </Button>
      </CardContent>
    </Card>
  )
}

type AgentMonitorCardProps = {
  theme: ThemeMode
  agents: Agent[]
  loading: boolean
  pending: boolean
  onToggleAgent: (agentId: string, isRunning: boolean) => void
}

export function AgentMonitorCard({ theme, agents, loading, pending, onToggleAgent }: Readonly<AgentMonitorCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-orange-500" />
          پایش ایجنت ها
          <Badge className="mr-auto bg-emerald-600">{agents.filter((a) => a.is_running).length}/{agents.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[320px] space-y-2 overflow-auto text-xs">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          agents.map((agent) => (
            <div key={agent.agent_id} className={`rounded border p-2 ${panel(theme)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {agent.is_running ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Square className="h-3.5 w-3.5 text-rose-500" />}
                  <span className="font-mono">{agent.agent_id}</span>
                </div>
                <Button
                  size="sm"
                  variant={agent.is_running ? 'destructive' : 'default'}
                  className="h-7"
                  onClick={() => onToggleAgent(agent.agent_id, agent.is_running)}
                  disabled={pending}
                >
                  {agent.is_running ? 'توقف' : 'شروع'}
                </Button>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                <span className={muted(theme)}>وضعیت: {agent.state || (agent.is_running ? 'running' : 'stopped')}</span>
                <span className={muted(theme)}>سلامت: {agent.health || (agent.is_running ? 'healthy' : 'idle')}</span>
                <span className={muted(theme)}>خطا: {agent.errors ?? 0}</span>
                <span className={muted(theme)}>تسک: {agent.current_task || 'ندارد'}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

type ActivityFeedCardProps = {
  theme: ThemeMode
  displayedActivities: ActivityItem[]
  mergedCount: number
  showAll: boolean
  onToggleShowAll: () => void
}

export function ActivityFeedCard({ theme, displayedActivities, mergedCount, showAll, onToggleShowAll }: Readonly<ActivityFeedCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-cyan-500" />
          رویداد زنده
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[320px] space-y-2 overflow-auto text-xs">
        {displayedActivities.map((act, idx) => (
          <div key={`${act.ts}-${idx}`} className={`rounded border p-2 ${panel(theme)}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{act.title}</span>
              <span className={muted(theme)}>{formatClock(act.ts)}</span>
            </div>
            {act.detail ? <p className={`mt-1 truncate ${muted(theme)}`}>{act.detail}</p> : null}
          </div>
        ))}
        {mergedCount > 10 ? (
          <Button variant="ghost" size="sm" className="w-full" onClick={onToggleShowAll}>
            {showAll ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            {showAll ? 'نمایش کمتر' : `نمایش ${mergedCount - 10} مورد بیشتر`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

type MemoryLogsCardProps = {
  theme: ThemeMode
  snapshots: Snapshot[]
  pending: boolean
  onSnapshot: () => void
}

export function MemoryLogsCard({ theme, snapshots, pending, onSnapshot }: Readonly<MemoryLogsCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MemoryStick className="h-4 w-4 text-indigo-500" />
          حافظه و لاگ ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="max-h-[140px] space-y-1 overflow-auto">
          {snapshots.slice(0, 6).map((snap) => (
            <div key={snap.id} className={`flex items-center justify-between rounded border px-2 py-1 ${panel(theme)}`}>
              <span className="truncate">{snap.label}</span>
              <span className={muted(theme)}>{formatDate(snap.created_at)}</span>
            </div>
          ))}
        </div>
        <Button className="w-full" variant="outline" onClick={onSnapshot} disabled={pending}>
          <Database className="ml-1 h-4 w-4" />
          ساخت Snapshot جدید
        </Button>
      </CardContent>
    </Card>
  )
}

type TaskGraphCardProps = {
  theme: ThemeMode
  taskGraphData?: TaskGraph
}

export function TaskGraphCard({ theme, taskGraphData }: Readonly<TaskGraphCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-violet-500" />
          گراف تسک ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className={`rounded border p-2 ${panel(theme)}`}>
          {(taskGraphData?.nodes || []).map((node) => (
            <div key={node.id} className="mb-1 flex items-center justify-between last:mb-0">
              <span>{node.label}</span>
              <span>{renderNodeStateBadge(node)}</span>
            </div>
          ))}
        </div>
        <progress
          className="h-2 w-full overflow-hidden rounded [&::-webkit-progress-bar]:bg-slate-300/50 [&::-webkit-progress-value]:bg-violet-500"
          max={100}
          value={Math.min(Math.max(taskGraphData?.progress || 0, 0), 100)}
        />
        <p className={muted(theme)}>تسک فعال: {taskGraphData?.current_task || 'ندارد'}</p>
      </CardContent>
    </Card>
  )
}

type ManualPanelCardProps = {
  theme: ThemeMode
  taskPrompt: string
  setTaskPrompt: (value: string) => void
  sendTaskPending: boolean
  onSendTask: () => void
  command: string
  setCommand: (value: string) => void
  commandPending: boolean
  onRunCommand: () => void
  commandResult: string
}

export function ManualPanelCard({
  theme,
  taskPrompt,
  setTaskPrompt,
  sendTaskPending,
  onSendTask,
  command,
  setCommand,
  commandPending,
  onRunCommand,
  commandResult,
}: Readonly<ManualPanelCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4 text-pink-500" />
          پنل تعامل دستی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Textarea
          value={taskPrompt}
          onChange={(e) => setTaskPrompt(e.target.value)}
          placeholder="تسک جدید برای Core بنویسید..."
          className="min-h-[90px]"
        />
        <Button className="w-full" onClick={onSendTask} disabled={!taskPrompt.trim() || sendTaskPending}>
          <Send className="ml-1 h-4 w-4" />
          ثبت تسک جدید
        </Button>
        <div className="flex gap-2">
          <Input value={command} onChange={(e) => setCommand(e.target.value)} className="font-mono" />
          <Button aria-label="run-core-command" onClick={onRunCommand} disabled={commandPending}>
            <Terminal className="h-4 w-4" />
          </Button>
        </div>
        {commandResult ? <pre className={`max-h-[140px] overflow-auto rounded border p-2 ${panel(theme)}`}>{commandResult}</pre> : null}
      </CardContent>
    </Card>
  )
}

type ChatCardProps = {
  theme: ThemeMode
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string; ts: string }>
  chatPending: boolean
  chatInput: string
  setChatInput: (value: string) => void
  onSend: () => void
  chatEndRef: RefObject<HTMLDivElement>
}

export function ChatCard({ theme, chatMessages, chatPending, chatInput, setChatInput, onSend, chatEndRef }: Readonly<ChatCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-emerald-500" />
          گفتگوی مستقیم با Core
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className={`h-[210px] space-y-2 overflow-auto rounded border p-2 ${panel(theme)}`}>
          {chatMessages.map((msg, idx) => (
            <div key={`${msg.ts}-${idx}`} className={`rounded p-2 ${bubbleClass(theme, msg.role)}`}>
              {msg.content}
            </div>
          ))}
          {chatPending ? (
            <div className={`flex items-center gap-2 rounded p-2 ${panel(theme)}`}>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>در حال دریافت پاسخ...</span>
            </div>
          ) : null}
          <div ref={chatEndRef} />
        </div>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend()
            }}
            placeholder="دستور یا سوال خود را بنویسید"
          />
          <Button aria-label="send-core-chat" onClick={onSend} disabled={chatPending || !chatInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

type SelfImprovementCardProps = {
  theme: ThemeMode
  selfCompletionData?: SelfCompletionStatus
}

export function SelfImprovementCard({ theme, selfCompletionData }: Readonly<SelfImprovementCardProps>) {
  return (
    <Card className={`${cardBase(theme)} ${styles.cardLift}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-amber-500" />
          Self-Improvement Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className="font-semibold">آخرین گلوگاه</p>
          <p className={muted(theme)}>{selfCompletionData?.bottlenecks?.[0]?.title || 'فعلا مورد بحرانی ثبت نشده'}</p>
          <p className={muted(theme)}>{selfCompletionData?.bottlenecks?.[0]?.detail || ''}</p>
        </div>
        <div className={`rounded border p-2 ${panel(theme)}`}>
          <p className="font-semibold">آخرین بهینه سازی</p>
          <p className={muted(theme)}>{selfCompletionData?.optimizations?.[0]?.title || 'بهینه سازی جدیدی ثبت نشده'}</p>
          <p className={muted(theme)}>{selfCompletionData?.optimizations?.[0]?.detail || ''}</p>
        </div>
      </CardContent>
    </Card>
  )
}

type FooterBarProps = {
  theme: ThemeMode
  ts?: string
}

export function FooterBar({ theme, ts }: Readonly<FooterBarProps>) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-center text-xs ${cardBase(theme)}`}>
      اتصال زنده Core ↔ Front برقرار است. آخرین به روزرسانی: {ts ? new Date(ts).toLocaleString('fa-IR') : '...'}
    </div>
  )
}
