import React, { useEffect, useState } from 'react';

interface PaymentIn {
  id?: number;
  invoice_id?: number;
  direction: string;
  method?: string;
  amount: number;
  status?: string;
  reference?: string;
  note?: string;
}

export default function PaymentEditor() {
  const [pid, setPid] = useState<number | null>(null);
  const [data, setData] = useState<PaymentIn>({ direction: 'in', amount: 0, method: 'cash', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = location.hash; // #payment/new or #payment/123
    const parts = hash.replace('#', '').split('/');
    if (parts[0] === 'payment' && parts[1] && parts[1] !== 'new') {
      const id = parseInt(parts[1], 10);
      if (!isNaN(id)) {
        setPid(id);
        fetch(`/api/payments/${id}`).then(r => r.json()).then(setData);
      }
    }
    const prefill = localStorage.getItem('hp.prefill.payment');
    if (prefill && parts[1] === 'new') {
      try {
        const obj = JSON.parse(prefill);
        setData(d => ({ ...d, ...obj }));
      } catch {}
    }
  }, []);

  const close = () => { location.hash = ''; };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = JSON.stringify(data);
    const res = await fetch(pid ? `/api/payments/${pid}` : '/api/payments', {
      method: pid ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      try {
        const j = await res.json();
        setError(j?.detail || 'ثبت پرداخت ناموفق بود');
      } catch {
        setError('ثبت پرداخت ناموفق بود');
      }
      setSaving(false);
      return;
    }
    await res.json();
    setSaving(false);
    close();
  };

  if (!location.hash.startsWith('#payment')) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow w-full max-w-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{pid ? 'ویرایش پرداخت' : 'افزودن پرداخت'}</h2>
          <button onClick={close}>✕</button>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">شناسه فاکتور
            <input className="border p-2 rounded w-full" type="number" value={data.invoice_id || ''} onChange={e => setData({ ...data, invoice_id: parseInt(e.target.value || '0') || undefined })} />
          </label>
          <label className="text-sm">مبلغ
            <input className="border p-2 rounded w-full" type="number" value={data.amount} onChange={e => setData({ ...data, amount: parseInt(e.target.value || '0') || 0 })} />
          </label>
          <label className="text-sm">جهت
            <select className="border p-2 rounded w-full" value={data.direction} onChange={e => setData({ ...data, direction: e.target.value })}>
              <option value="in">دریافتی</option>
              <option value="out">پرداختی</option>
            </select>
          </label>
          <label className="text-sm">روش
            <select className="border p-2 rounded w-full" value={data.method} onChange={e => setData({ ...data, method: e.target.value })}>
              <option value="cash">نقد</option>
              <option value="bank">بانکی</option>
              <option value="pos">کارتخوان</option>
              <option value="other">سایر</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">ارجاع
            <input className="border p-2 rounded w-full" value={data.reference || ''} onChange={e => setData({ ...data, reference: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-2">یادداشت
            <textarea className="border p-2 rounded w-full" rows={3} value={data.note || ''} onChange={e => setData({ ...data, note: e.target.value })} />
          </label>
        </div>

        <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
          <button className="px-3 py-2 bg-slate-200 rounded" onClick={close}>انصراف</button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={save} disabled={saving}>{saving ? '...' : 'ذخیره'}</button>
        </div>
      </div>
    </div>
  );
}
