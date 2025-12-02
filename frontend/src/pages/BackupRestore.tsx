import React from 'react'
import { apiGet, apiPost, apiDelete } from '../services/api'

interface Backup {
  id: number
  filename: string
  kind: string
  created_at: string
  size_bytes?: number
  note?: string
}

const BackupRestore: React.FC = () => {
  const [backups, setBackups] = React.useState<Backup[]>([])
  const [loading, setLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [note, setNote] = React.useState('')
  const [msg, setMsg] = React.useState<string | null>(null)

  const load = async () => {
    setLoading(true); setMsg(null)
    try {
      const res = await apiGet('/api/backups/')
      setBackups(Array.isArray(res) ? res : [])
    } catch(e:any) { setMsg(e?.message || 'خطا در بارگذاری'); setBackups([]) } finally { setLoading(false) }
  }

  React.useEffect(() => { load() }, [])

  const createBackup = async () => {
    setCreating(true); setMsg(null)
    try {
      await apiPost('/api/backups/manual', { note: note.trim() || 'Manual backup' })
      setMsg('پشتیبان‌گیری انجام شد')
      setNote('')
      await load()
    } catch(e:any) { setMsg(e?.message || 'خطا در ایجاد بکاپ') } finally { setCreating(false) }
  }

  const downloadBackup = (id: number) => {
    window.open(`/api/backups/${id}/download`, '_blank')
  }

  const deleteBackup = async (id: number) => {
    if (!window.confirm('آیا از حذف این بکاپ اطمینان دارید؟')) return
    setMsg(null)
    try {
      await apiDelete(`/api/backups/${id}`)
      setMsg('بکاپ حذف شد')
      await load()
    } catch(e:any) { setMsg(e?.message || 'خطا در حذف') }
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const formatDate = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
    } catch { return iso }
  }

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">پشتیبان‌گیری و بازیابی</h2>
        <button className="hp-button" onClick={load} disabled={loading}>{loading ? '...' : 'بروزرسانی'}</button>
      </div>
      {msg && <div className="hp-badge mt-2">{msg}</div>}

      <div className="mt-3 hp-card p-3 bg-[var(--secondary)]/20">
        <h3 className="font-semibold mb-2">ایجاد بکاپ دستی</h3>
        <input className="hp-input w-full mb-2" placeholder="یادداشت (اختیاری)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="hp-button" onClick={createBackup} disabled={creating}>{creating ? '...' : 'ایجاد بکاپ'}</button>
      </div>

      <div className="mt-3">
        <h3 className="font-semibold mb-2">لیست بکاپ‌ها</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right">
                <th className="px-3 py-2">شناسه</th>
                <th className="px-3 py-2">نوع</th>
                <th className="px-3 py-2">تاریخ</th>
                <th className="px-3 py-2">حجم</th>
                <th className="px-3 py-2">یادداشت</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">{b.filename}</td>
                  <td className="px-3 py-2"><span className={`hp-badge ${b.kind==='manual'?'success':'dark'}`}>{b.kind==='manual'?'دستی':'خودکار'}</span></td>
                  <td className="px-3 py-2">{formatDate(b.created_at)}</td>
                  <td className="px-3 py-2">{formatBytes(b.size_bytes)}</td>
                  <td className="px-3 py-2">{b.note || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button className="hp-button text-xs" onClick={() => downloadBackup(b.id)}>دانلود</button>
                      <button className="hp-button text-xs bg-red-600 hover:bg-red-700" onClick={() => deleteBackup(b.id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={6}>{loading ? 'در حال بارگذاری...' : 'هیچ بکاپی یافت نشد'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default BackupRestore
