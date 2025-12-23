import React, { useCallback, useEffect, useRef, useState } from 'react'

import { apiGet, apiPost, apiPut } from '../../services/api'
import { toast } from '../../utils/toast'

import { retroBadge, retroButton, retroHeading, retroInput, retroPanelPadded } from '../retroTheme'
import {
  AutoSaveState,
  DEFAULT_AUTO_SAVE_DELAY_MS,
  describeAutoSaveState,
  scheduleAutoSaveIdleReset,
} from '../../modules/settings/autoSave'

type SmsSettings = {
  provider?: string

  base_url?: string | null

  default_sender?: string | null

  enabled?: boolean

  low_credit_threshold?: number | null

  api_key_masked?: string | null
}

export default function SmsSettingsPanel() {
  const [settings, setSettings] = useState<SmsSettings>({
    provider: 'ippanel',

    base_url: 'https://edge.ippanel.com/v1',

    default_sender: '',

    enabled: false,

    low_credit_threshold: 0,

    api_key_masked: null,
  })

  const [testNumber, setTestNumber] = useState('')

  const [busy, setBusy] = useState(false)

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>('idle')
  const saveTimer = useRef<number | null>(null)
  const settingsRef = useRef(settings)
  const apiKeyRef = useRef(apiKeyInput)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    apiKeyRef.current = apiKeyInput
  }, [apiKeyInput])

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
      }
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await apiGet<SmsSettings>('/api/settings/sms')

      if (data) setSettings((prev) => ({ ...prev, ...data }))
    } catch (err: any) {
      toast.error(err?.message || 'خطا در دریافت تنظیمات پیامک')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persistSettings = useCallback(async () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    setAutoSaveState('saving')
    try {
      await apiPut('/api/settings/sms', {
        ...settingsRef.current,
        api_key: apiKeyRef.current || undefined,
      })
      if (apiKeyRef.current) {
        setApiKeyInput('')
        apiKeyRef.current = ''
      }
      setAutoSaveState('saved')
      scheduleAutoSaveIdleReset(setAutoSaveState)
      await load()
    } catch (err: any) {
      setAutoSaveState('error')
      toast.error(err?.message || 'ثبت تنظیمات ناموفق بود')
    }
  }, [load])

  const scheduleAutoSave = useCallback(() => {
    setAutoSaveState((prev) => (prev === 'saving' ? prev : 'pending'))
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      void persistSettings()
    }, DEFAULT_AUTO_SAVE_DELAY_MS)
  }, [persistSettings])

  const updateSettingsField = useCallback(
    (updater: (prev: SmsSettings) => SmsSettings) => {
      setSettings((prev) => updater(prev))
      scheduleAutoSave()
    },
    [scheduleAutoSave],
  )

  const updateApiKey = useCallback(
    (value: string) => {
      setApiKeyInput(value)
      scheduleAutoSave()
    },
    [scheduleAutoSave],
  )

  const sendTest = async () => {
    if (!testNumber) {
      toast.warning('شماره را وارد کنید.')

      return
    }

    setBusy(true)

    try {
      await apiPost('/api/settings/sms/test', {
        to: testNumber,
        message:
          'پیامک آزمایشی سیستم',
      })

      toast.success('پیامک تست ارسال شد.')
    } catch (err: any) {
      toast.error(err?.message || 'ارسال تست ناموفق بود')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className={`${retroPanelPadded} space-y-4 bg-[#f7f2e7] border border-[#e0d4b8] shadow-[6px_6px_0_rgba(0,0,0,0.08)]`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className={retroHeading}>
            تنظیمات
            پیامک
            (IPPanel)
          </p>

          <p className="text-sm text-[#4b4339]">
            ارسال
            پیامک،
            خط
            ارسال،
            و
            توکن
            دسترسی
          </p>
        </div>

      </div>

      <div className="grid md:grid-cols-2 gap-3 bg-white border border-[#e0d4b8] p-3 rounded-lg">
        <label className="text-sm text-[#4b4339] space-y-1">
          خط
          ارسال
          <input
            className={retroInput}
            value={settings.default_sender || ''}
            onChange={(e) =>
              updateSettingsField((prev) => ({ ...prev, default_sender: e.target.value }))
            }
          />
        </label>

        <label className="text-sm text-[#4b4339] space-y-1">
          آستانه
          هشدار
          اعتبار
          <input
            type="number"
            className={retroInput}
            value={settings.low_credit_threshold ?? 0}
            onChange={(e) =>
              updateSettingsField((prev) => ({
                ...prev,
                low_credit_threshold: Number(e.target.value),
              }))
            }
          />
        </label>

        <label className="text-sm text-[#4b4339] space-y-1">
          پایه URL
          <input
            className={retroInput}
            value={settings.base_url || ''}
            onChange={(e) =>
              updateSettingsField((prev) => ({ ...prev, base_url: e.target.value }))
            }
          />
        </label>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings.enabled}
              onChange={(e) =>
                updateSettingsField((prev) => ({ ...prev, enabled: e.target.checked }))
              }
            />
            فعال
          </label>

          <span className={retroBadge}>
            {settings.api_key_masked
              ? `توکن: ${settings.api_key_masked}`
              : 'توکن ثبت نشده'}
          </span>
        </div>

        <label className="text-sm text-[#4b4339] space-y-1 md:col-span-2">
          توکن / API Key
          <input
            className={retroInput}
            type="password"
            placeholder="*******"
            value={apiKeyInput}
            onChange={(e) => updateApiKey(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-[#4b4339]">
          {describeAutoSaveState(autoSaveState)}
        </span>
        <div className="flex items-center gap-2">
          <input
            className={retroInput}
            placeholder="شماره تست"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
          />

          <button className={retroButton} onClick={sendTest} disabled={busy}>
            ارسال
            تست
          </button>
        </div>
      </div>
    </section>
  )
}
