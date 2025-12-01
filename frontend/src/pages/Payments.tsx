import React, { useEffect, useState } from 'react';

interface Payment {
  id: number;
  invoice_id: number;
  direction: string;
  method?: string;
  amount: number;
  status: string;
  created_at?: string;
}

export default function Payments() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (status) params.set('status', status);
    if (direction) params.set('direction', direction);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('page', String(page));
    params.set('limit', String(limit));
    const res = await fetch(`/api/payments?${params.toString()}`);
    const data = await res.json();
    setItems(data || []);
    // fetch count for pagination
    const resCount = await fetch(`/api/payments/count?${params.toString()}`);
    const c = await resCount.json();
    setTotalCount(Number(c?.count || 0));
    setLoading(false);
  };

  useEffect(() => { load(); }, [method, status, direction, dateFrom, dateTo, page]);

  const exportCsv = async () => {
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (status) params.set('status', status);
    if (direction) params.set('direction', direction);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const res = await fetch(`/api/payments/export?format=csv&${params.toString()}`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">پرداخت‌ها</h1>
        <div className="space-x-2 rtl:space-x-reverse">
          <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={exportCsv}>خروجی CSV</button>
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => { location.hash = '#payment/new'; }}>افزودن پرداخت</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <select className="border p-2 rounded" value={direction} onChange={e => setDirection(e.target.value)}>
          <option value="">جهت (همه)</option>
          <option value="in">دریافتی</option>
          <option value="out">پرداختی</option>
        </select>
        <select className="border p-2 rounded" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="">روش (همه)</option>
          <option value="cash">نقد</option>
          <option value="bank">بانکی</option>
          <option value="pos">کارتخوان</option>
          <option value="other">سایر</option>
        </select>
        <select className="border p-2 rounded" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">وضعیت (همه)</option>
          <option value="draft">پیش‌نویس</option>
          <option value="posted">ثبت‌شده</option>
          <option value="reconciled">تسویه‌شده</option>
          <option value="void">باطل</option>
        </select>
        <input type="datetime-local" className="border p-2 rounded" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type="datetime-local" className="border p-2 rounded" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <button className="px-3 py-2 bg-slate-200 rounded" onClick={()=>{ setPage(1); load(); }}>{loading ? '...' : 'اعمال فیلتر'}</button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-right">شناسه</th>
              <th className="p-2 text-right">فاکتور</th>
              <th className="p-2 text-right">جهت</th>
              <th className="p-2 text-right">روش</th>
              <th className="p-2 text-right">مبلغ</th>
              <th className="p-2 text-right">وضعیت</th>
              <th className="p-2 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.id}</td>
                <td className="p-2">
                  {p.invoice_id}
                  {p.invoice_id ? (
                    <button className="ml-2 px-2 py-0.5 text-xs bg-slate-200 rounded" onClick={()=>{ location.hash = `#invoice-edit:${p.invoice_id}`; }}>مشاهده</button>
                  ) : null}
                </td>
                <td className="p-2">{p.direction === 'in' ? 'دریافتی' : 'پرداختی'}</td>
                <td className="p-2">{p.method || '-'}</td>
                <td className="p-2">{p.amount?.toLocaleString('fa-IR')}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">
                  <button className="px-2 py-1 bg-slate-200 rounded" onClick={() => { location.hash = `#payment/${p.id}`; }}>ویرایش</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50" disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))}>قبلی</button>
          <button className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50" disabled={page >= Math.max(1, Math.ceil((totalCount||0) / (limit||1)))} onClick={()=> setPage(p=> p+1)}>بعدی</button>
        </div>
        <span className="text-sm">صفحه {page} از {Math.max(1, Math.ceil((totalCount||0) / (limit||1)))} (کل: {totalCount})</span>
        <select className="border p-1 rounded" value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)||20); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
