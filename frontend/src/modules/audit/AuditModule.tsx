import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../services/api'
import { retroPanelPadded, retroHeading, retroButton, retroInput, retroLabel } from '../../components/retroTheme'

type MerkleBatch = {
  ts: string
  entity_type: string
  count: number
  entry_ids: number[]
  merkle_root: string
}

export default function AuditModule() {
  const [latest, setLatest] = useState<MerkleBatch | null>(null)
  const [limit, setLimit] = useState<number>(50)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLatest() {
    setError(null)
    try {
      const data = await apiGet<MerkleBatch>('/api/audit/otp/batch/latest')
      setLatest(data)
    } catch (e: any) {
      setLatest(null)
      setError(e?.message || 'No batch found')
    }
  }

  async function buildBatch() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiPost<MerkleBatch>(`/api/audit/otp/batch/build?limit=${limit}`)
      setLatest(data)
    } catch (e: any) {
      setError(e?.message || 'Batch build failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLatest()
  }, [])

  return (
    <div className="p-4">
      <div className={`${retroPanelPadded} space-y-4`}>
        <h2 className={retroHeading}>سامانه ممیزی نامتغیر (Merkle)</h2>
        <p className="text-sm">ساخت Batch از آخرین رویدادهای OTP و مشاهده مرکل‌روت</p>

        <div>
          <label className={retroLabel}>تعداد ورودی‌ها برای Batch</label>
          <input
            type="number"
            className={`${retroInput} w-32`}
            value={limit}
            min={1}
            max={500}
            onChange={e => setLimit(Number(e.target.value) || 50)}
          />
        </div>

        <div className="flex gap-3">
          <button className={retroButton} onClick={buildBatch} disabled={loading}>
            {loading ? 'در حال ساخت...' : 'ساخت Batch'}
          </button>
          <button className={retroButton} onClick={loadLatest} disabled={loading}>آخرین Batch</button>
        </div>

        {error && (
          <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
            {error}
          </div>
        )}

        {latest && (
          <div className="mt-4">
            <div className="text-xs">زمان: {latest.ts}</div>
            <div className="text-xs">نوع: {latest.entity_type}</div>
            <div className="text-xs">تعداد: {latest.count}</div>
            <div className="text-xs break-all">مرکل‌روت: {latest.merkle_root}</div>
          </div>
        )}
      </div>
    </div>
  )
}
