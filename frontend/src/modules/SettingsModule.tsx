import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroInput,
  retroPanelPadded,
} from '../components/retroTheme'
import { apiGet, apiPatch, apiPut } from '../services/api'
import { toast } from '../utils/toast'
import FiscalYearPanel from '../components/settings/FiscalYearPanel'
import SmsSettingsPanel from '../components/settings/SmsSettingsPanel'
import SmartAssistantSettingsPanel from '../components/settings/SmartAssistantSettingsPanel'
import NeuroChainXPanel from '../components/settings/NeuroChainXPanel'

type SettingsPayload = {
  theme: string
  rtl: boolean
  currency: string
  language: string
  default_fiscal_year_id: number | null
  invoice_default_tax_rate: number
  invoice_prefix_template: string
  invoice_auto_sms: boolean
  invoice_numbering_mode: 'auto' | 'manual'
  invoice_default_payment_terms: number
  sidebar_order: string[]
  sidebar_collapsed: boolean
  notifications: { email: boolean; sms: boolean; desktop: boolean }
  backup: { path: string; auto: boolean; cron: string }
}

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'finance', label: 'Finance' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'sms', label: 'SMS' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'backup', label: 'Backup' },
  { id: 'dev', label: 'Dev' },
  { id: 'neurochainx', label: 'NeuroChainX' },
]

const debounce = (fn: () => void, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(fn, delay)
  }
}

export default function SettingsModule({ smartDate }: ModuleComponentProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState<SettingsPayload>({
    theme: 'system',
    rtl: true,
    currency: 'irr',
    language: 'fa',
    default_fiscal_year_id: null,
    invoice_default_tax_rate: 0,
    invoice_prefix_template: 'INV-{{year}}-{{counter}}',
    invoice_auto_sms: false,
    invoice_numbering_mode: 'auto',
    invoice_default_payment_terms: 0,
    sidebar_order: [],
    sidebar_collapsed: false,
    notifications: { email: true, sms: false, desktop: false },
    backup: { path: '/data/backups', auto: false, cron: '0 3 * * *' },
  })
  const [fiscalYears, setFiscalYears] = useState<{ id: number; title: string }[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSettings = async () => {
    setBusy(true)
    try {
      const data = await apiGet<SettingsPayload>('/api/settings')
      if (data) setSettings((prev) => ({ ...prev, ...data }))
      try {
        const fy = await apiGet<any[]>('/api/fiscal-years')
        if (fy) setFiscalYears(fy.map((f) => ({ id: f.id, title: f.title })))
      } catch {
        // ignore fiscal list errors
      }
    } catch (err: any) {
      toast.error(err?.message || 'Settings load failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        saveSettings(false)
      }, 500),
    [],
  )

  const saveSettings = async (show = true) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    try {
      await apiPut('/api/settings', settings)
      if (show) toast.success('Settings saved')
    } catch (err: any) {
      toast.error(err?.message || 'Save failed')
    }
  }

  const handleChange = (field: keyof SettingsPayload, value: any, instant = true) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    if (instant) debouncedSave()
  }

  const toggleNotification = (key: keyof SettingsPayload['notifications']) => {
    const next = { ...settings.notifications, [key]: !settings.notifications[key] }
    handleChange('notifications', next)
  }

  const tabCard = (children: React.ReactNode) => (
    <section
      className={`${retroPanelPadded} space-y-4 bg-[var(--background)] border border-[var(--border)]`}
    >
      {children}
    </section>
  )

  return (
    <div className="space-y-4" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={retroHeading}>Settings</p>
          <p className="text-sm text-[var(--primary)] opacity-70">
            System, appearance, finance, invoice defaults, SMS, and assistant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={retroBadge}>Active date: {smartDate.jalali || '---'}</span>
          <button className={retroButton} onClick={() => saveSettings()} disabled={busy}>
            Save
          </button>
        </div>
      </header>

      {activeTab === 'neurochainx' && (
        <div className="mt-4">
          <NeuroChainXPanel />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`${retroButton} ${activeTab === t.id ? '!bg-[var(--primary)] text-white' : '!bg-[var(--background)] !text-[var(--primary)]'}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' &&
        tabCard(
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-[var(--primary)] space-y-1">
              Language
              <select
                className={retroInput}
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <option value="fa">Farsi</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="text-sm text-[var(--primary)] space-y-1">
              Currency
              <select
                className={retroInput}
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
              >
                <option value="irr">Rial</option>
                <option value="toman">Toman</option>
                <option value="usd">USD</option>
              </select>
            </label>
            <label className="text-sm text-[var(--primary)] space-y-1">
              Direction
              <select
                className={retroInput}
                value={settings.rtl ? 'rtl' : 'ltr'}
                onChange={(e) => handleChange('rtl', e.target.value === 'rtl')}
              >
                <option value="rtl">RTL</option>
                <option value="ltr">LTR</option>
              </select>
            </label>
            <div className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.sidebar_collapsed}
                onChange={(e) => handleChange('sidebar_collapsed', e.target.checked)}
              />
              Collapse sidebar
            </div>
          </div>,
        )}

      {activeTab === 'appearance' &&
        tabCard(
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-[var(--primary)] space-y-1">
              Theme
              <select
                className={retroInput}
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <div className="text-sm text-[var(--primary)] space-y-1">
              Notifications
              <div className="flex gap-3 flex-wrap text-[13px]">
                {['email', 'sms', 'desktop'].map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(settings.notifications as any)[key]}
                      onChange={() => toggleNotification(key as any)}
                    />
                    {key}
                  </label>
                ))}
              </div>
            </div>
          </div>,
        )}

      {activeTab === 'finance' &&
        tabCard(
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--primary)] space-y-1">
              Default fiscal year
              <select
                className={retroInput}
                value={settings.default_fiscal_year_id ?? ''}
                onChange={(e) =>
                  handleChange(
                    'default_fiscal_year_id',
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">---</option>
                {fiscalYears.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm text-[var(--primary)] space-y-1">
              Sidebar order
              <button
                className={retroButton}
                onClick={() =>
                  apiPatch('/api/users/preferences/sidebar-order', {
                    order: settings.sidebar_order,
                  })
                }
              >
                Save sidebar order
              </button>
            </div>
          </div>,
        )}

      {activeTab === 'invoice' &&
        tabCard(
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--primary)] space-y-1">
              Default tax rate (%)
              <input
                className={retroInput}
                type="number"
                value={settings.invoice_default_tax_rate}
                onChange={(e) => handleChange('invoice_default_tax_rate', Number(e.target.value))}
              />
            </label>
            <label className="text-sm text-[var(--primary)] space-y-1">
              Prefix template
              <input
                className={retroInput}
                value={settings.invoice_prefix_template}
                onChange={(e) => handleChange('invoice_prefix_template', e.target.value)}
              />
            </label>
            <label className="text-sm text-[var(--primary)] space-y-1">
              Numbering mode
              <select
                className={retroInput}
                value={settings.invoice_numbering_mode}
                onChange={(e) =>
                  handleChange('invoice_numbering_mode', e.target.value as 'auto' | 'manual')
                }
              >
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="text-sm text-[var(--primary)] space-y-1">
              Payment terms (days)
              <input
                className={retroInput}
                type="number"
                value={settings.invoice_default_payment_terms}
                onChange={(e) =>
                  handleChange('invoice_default_payment_terms', Number(e.target.value))
                }
              />
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.invoice_auto_sms}
                onChange={(e) => handleChange('invoice_auto_sms', e.target.checked)}
              />
              Auto-send SMS after finalize
            </label>
          </div>,
        )}

      {activeTab === 'fiscal' && <FiscalYearPanel />}

      {activeTab === 'sms' && <SmsSettingsPanel />}

      {activeTab === 'assistant' && <SmartAssistantSettingsPanel />}

      {activeTab === 'backup' &&
        tabCard(
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--primary)] space-y-1">
              Backup path
              <input
                className={retroInput}
                value={settings.backup.path}
                onChange={(e) =>
                  handleChange('backup', { ...settings.backup, path: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-[var(--primary)] space-y-1">
              Cron
              <input
                className={retroInput}
                value={settings.backup.cron}
                onChange={(e) =>
                  handleChange('backup', { ...settings.backup, cron: e.target.value })
                }
              />
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.backup.auto}
                onChange={(e) =>
                  handleChange('backup', { ...settings.backup, auto: e.target.checked }, false)
                }
              />
              Auto backup
            </label>
          </div>,
        )}

      {activeTab === 'dev' &&
        tabCard(
          <div className="space-y-2 text-sm text-[var(--primary)]">
            <p>Quick checks: call /api/version and /api/time/now after saving.</p>
            <div className="flex gap-2">
              <button className={retroButton} onClick={() => loadSettings()}>
                Reload settings
              </button>
            </div>
          </div>,
        )}
    </div>
  )
}
