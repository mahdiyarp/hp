import React, { useState } from 'react'





type Filters = { start?: string; end?: string; customer?: string }





export default function ReportFilters({ onApply }: { onApply?: (filters: Filters) => void }) {


  const [start, setStart] = useState('')


  const [end, setEnd] = useState('')


  const [customer, setCustomer] = useState('')





  const apply = () => {


    onApply && onApply({ start, end, customer })


  }





  return (


    <div className="border p-3 mb-4 bg-[#faf4de]">


      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">


        <label className="space-y-1">


          <span className="text-xs font-semibold">ط·آ·ط¢آ´ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ¹ (Jalali)</span>


          <input className="border px-2 py-1" value={start} onChange={e => setStart(e.target.value)} />


        </label>


        <label className="space-y-1">


          <span className="text-xs font-semibold">ط·آ¸ط¢آ¾ط·آ·ط¢آ§?ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ  (Jalali)</span>


          <input className="border px-2 py-1" value={end} onChange={e => setEnd(e.target.value)} />


        </label>


        <label className="space-y-1">


          <span className="text-xs font-semibold">ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ´ط·آ·ط¹آ¾ط·آ·ط¢آ±?</span>


          <input className="border px-2 py-1" value={customer} onChange={e => setCustomer(e.target.value)} />


        </label>


        <div className="flex items-end">


          <button className="px-3 py-2 bg-[#1f2e3b] text-white" onClick={apply}>ط·آ·ط¢آ§ط·آ·ط¢آ¹ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·آ¸أ¢â‚¬â€چ</button>


        </div>


      </div>


    </div>


  )


}


