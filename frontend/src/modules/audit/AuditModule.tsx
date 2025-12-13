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
  const [entityId, setEntityId] = useState<string>('09123506545')
  const [entryId, setEntryId] = useState<number>(0)
  const [proof, setProof] = useState<any | null>(null)

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

  async function loadProof() {
    setLoading(true)
    setError(null)
    setProof(null)
    try {
      const data = await apiGet<any>(`/api/audit/otp/proof?entity_id=${encodeURIComponent(entityId)}&entry_id=${entryId}`)
      setProof(data)
    } catch (e: any) {
      setError(e?.message || 'Proof fetch failed')
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
            {latest.entry_ids?.length ? (
              <div className="mt-2 text-xs">IDs اخیر: {latest.entry_ids.slice(0, 10).join(', ')}{latest.entry_ids.length > 10 ? ' ...' : ''}</div>
            ) : null}
          </div>
        )}

        <hr className="my-4" />
        <h3 className={retroHeading}>مرکل‌پروف یک ورودی</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className={retroLabel}>شناسه موجودیت (entity_id)</label>
            <input className={`${retroInput} w-full`} value={entityId} onChange={e => setEntityId(e.target.value)} />
          </div>
          <div>
            <label className={retroLabel}>شناسه ورودی (entry_id)</label>
            <input type="number" className={`${retroInput} w-full`} value={entryId} onChange={e => setEntryId(Number(e.target.value) || 0)} />
          </div>
          <div>
            <button className={retroButton} onClick={loadProof} disabled={loading || !entityId || !entryId}>دریافت Proof</button>
          </div>
        </div>
        {proof && (
          <div className="mt-3 text-xs space-y-1">
            <div>اعتبار زنجیره: {String(proof.chain_is_valid)}</div>
            <div>پیام: {proof.chain_message}</div>
            <div className="break-all">data_hash: {proof.data_hash}</div>
            <div className="break-all">previous_hash: {proof.previous_hash}</div>
            <div className="break-all">merkle_root: {proof.merkle_root}</div>
            <div>مجموع ورودی‌ها: {proof.total_entries_in_chain}</div>
            <div>موقعیت ورودی در زنجیره: {proof.entry_position}</div>
          </div>
        )}
      </div>
    </div>
  )
}
