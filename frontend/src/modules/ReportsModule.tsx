import React, { useEffect, useMemo, useState } from 'react'




import type { ModuleComponentProps } from '../components/layout/AppShell'




import { apiGet } from '../services/api'




import { formatNumberFa, isoToJalali, formatPrice } from '../utils/num'



import {




  retroBadge,




  retroButton,




  retroHeading,




  retroInput,




  retroPanel,




  retroPanelPadded,




  retroTableHeader,




  retroMuted,




} from '../components/retroTheme'









interface PnLReport {




  sales: number




  purchases: number




  gross_profit: number




  start: string | null




  end: string | null




}









interface CashReport {




  method: string




  balance: number




}









interface StockValuation {




  product_id: string




  name: string




  inventory: number




  unit_price: number | null




  total_value: number




}









const CASH_METHODS = ['cash', 'bank', 'pos']









export default function ReportsModule({ smartDate }: ModuleComponentProps) {




  const [rangeDays, setRangeDays] = useState(30)




  const [loading, setLoading] = useState(true)




  const [error, setError] = useState<string | null>(null)




  const [warnings, setWarnings] = useState<string[]>([])




  const [pnl, setPnl] = useState<PnLReport | null>(null)




  const [cashAll, setCashAll] = useState<CashReport | null>(null)




  const [cashMethods, setCashMethods] = useState<Record<string, number>>({})




  const [stock, setStock] = useState<StockValuation[]>([])









  useEffect(() => {



    loadReports(rangeDays)



    // eslint-disable-next-line react-hooks/exhaustive-deps



  }, [rangeDays, smartDate.isoDate])








  async function loadReports(days: number) {




    setLoading(true)




    setError(null)




    const newWarnings: string[] = []




    try {




      const endDate = smartDate.isoDate ? new Date(`${smartDate.isoDate}T00:00:00Z`) : new Date()




      const startDate = new Date(endDate.getTime())




      startDate.setUTCDate(startDate.getUTCDate() - days)









      const startParam = startDate.toISOString()




      const endParam = new Date(endDate.getTime() + 24 * 3600 * 1000).toISOString()




      try {




        const pnlData = await apiGet<PnLReport>(




          `/api/reports/pnl?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(




            endParam,




          )}`,




        )




        setPnl(pnlData)




      } catch (err) {




        console.error(err)




        newWarnings.push('ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾.')




      }









      try {




        const cashData = await apiGet<CashReport>('/api/reports/cash')




        setCashAll(cashData)




      } catch (err) {




        console.error(err)




        newWarnings.push('ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ² ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾.')




      }









      const methodEntries: Record<string, number> = {}




      await Promise.all(




        CASH_METHODS.map(method =>




          apiGet<CashReport>(`/api/reports/cash?method=${method}`)




            .then(res => {




              methodEntries[method] = res.balance




            })




            .catch(err => {




              console.error(err)




              newWarnings.push(`ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ² ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ ${method} ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾.`)




            }),




        ),




      )




      setCashMethods(methodEntries)









      try {




        const stockData = await apiGet<StockValuation[]>('/api/reports/stock')




        setStock(stockData)




      } catch (err) {




        console.error(err)




        newWarnings.push('ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯.')




      }




    } catch (err) {




      console.error(err)




      setError('ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ°ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ¯.')




    } finally {




      setWarnings(newWarnings)




      setLoading(false)




    }




  }









  const stockTotals = useMemo(() => {




    const count = stock.length




    const totalValue = stock.reduce((acc, item) => acc + (item.total_value || 0), 0)




    return { count, totalValue }




  }, [stock])









  if (loading) {




    return (




      <div className={`${retroPanel} p-10 flex items-center justify-center`}>




        <div className="space-y-3 text-center">




          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>




          <p className={`${retroHeading} text-[#1f2e3b]`}>ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§...</p>



        </div>




      </div>




    )




  }









  return (




    <div className="space-y-8">




      {error && (




        <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">




          {error}




        </div>




      )}









      {warnings.length > 0 && (



        <div className={`${retroPanel} p-4 space-y-2`}>



          <p className={`${retroHeading} text-[#7a6b4f]`}>ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´</p>



          <ul className="list-disc list-inside text-xs text-[#7a6b4f] space-y-1">



            {warnings.map((w, i) => (



              <li key={i}>{w}</li>



            ))}



          </ul>



        </div>



      )}








      <section className={`${retroPanelPadded} space-y-4`}>




        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">



          <div>



            <p className={retroHeading}>ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§</p>



            <h2 className="text-2xl font-semibold mt-2">ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢</h2>



            <p className={`text-xs ${retroMuted} mt-2`}>



              ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§: ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ® {smartDate.jalali ?? 'ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آµ'} (ISO {smartDate.isoDate ?? '---'})



            </p>



          </div>



          <div className="flex flex-wrap gap-3 items-center">



            <label className={`${retroHeading} text-[#f5f1e6] flex items-center gap-2`}>



              ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ (ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ²)



              <select



                value={rangeDays}



                onChange={e => setRangeDays(Number(e.target.value))}



                className={`${retroInput} w-32`}



              >



                <option value={7}>ط·آ·ط·â€؛ط·آ¢ط¢آ· (ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ¢ط¢آ© ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’)</option>



                <option value={30}>ط·آ·ط·â€؛ط·آ¢ط¢آ³ط·آ·ط·â€؛ط·آ¢ط¢آ° (ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ¢ط¢آ© ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’)</option>



                <option value={90}>ط·آ·ط·â€؛ط·آ¢ط¢آ¹ط·آ·ط·â€؛ط·آ¢ط¢آ° (ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’)</option>



                <option value={365}>ط·آ·ط·â€؛ط·آ¢ط¢آ³ط·آ·ط·â€؛ط·آ¢ط¢آ¶ط·آ·ط·â€؛ط·آ¢ط¢آµ (ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†)</option>



              </select>



            </label>



            <button className={`${retroButton} !bg-[#1f2e3b]`} type="button" onClick={() => loadReports(rangeDays)}>



              ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´



            </button>



          </div>



        </header>







        {pnl ? (



          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">



            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">



              <p className={retroHeading}>ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ´</p>



              <p className="text-lg font-semibold">{formatPrice(pnl.sales, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†')}</p>



            </div>



            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">



              <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¯</p>



              <p className="text-lg font-semibold">{formatPrice(pnl.purchases, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†')}</p>



            </div>



            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">



              <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آµ</p>



              <p className="text-lg font-semibold">{formatPrice(pnl.gross_profit, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†')}</p>



            </div>



          </div>



        ) : (



          <p className="text-xs text-[#7a6b4f]">ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ°ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ¯.</p>



        )}



      </section>









      <section className={`${retroPanelPadded} space-y-4`}>



        <header>



          <p className={retroHeading}>ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¶ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢</p>



          <h3 className="text-lg font-semibold mt-2">ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ² ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک/ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¹ط·آ¢ط¢آ©</h3>



        </header>



        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">



          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">



            <p className={retroHeading}>ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ¹ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢</p>



            <p className="text-lg font-semibold">



              {formatPrice(cashAll?.balance ?? 0, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†')}



            </p>



          </div>



          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">



            <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢</p>



            <div className="flex flex-wrap gap-2 text-xs">



              {CASH_METHODS.map(method => (



                <span key={method} className={retroBadge}>



                  {method === 'cash' ? 'ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک' : method === 'bank' ? 'ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢' : 'ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ '} :{' '}



                  {formatNumberFa(cashMethods[method] ?? 0)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†



                </span>



              ))}



            </div>



          </div>



        </div>



      </section>







      <section className={`${retroPanelPadded} space-y-4`}>



        <header>



          <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢</p>



          <h3 className="text-lg font-semibold mt-2">ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ°ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§</h3>



          <p className={`text-xs ${retroMuted} mt-2`}>



            ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§: {formatNumberFa(stockTotals.count)} | ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†: {formatPrice(stockTotals.totalValue, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†')}



          </p>



        </header>



        {stock.length > 0 ? (



          <table className="hp-table w-full border border-[#c5bca5] bg-[#faf4de] text-sm">



            <thead>



              <tr>




                <th className={retroTableHeader}>ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§</th>



                <th className={retroTableHeader}>ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢</th>



                <th className={retroTableHeader}>ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ¯</th>



                <th className={retroTableHeader}>ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</th>



              </tr>



            </thead>




            <tbody>




              {stock.slice(0, 12).map(item => (




                <tr key={item.product_id} className="border-b border-[#d9cfb6]">



                  <td className="px-3 py-2">{item.name}</td>



                  <td className="px-3 py-2 text-left">{formatNumberFa(item.inventory)}</td>



                  <td className="px-3 py-2 text-left">



                    {item.unit_price ? formatPrice(item.unit_price, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†') : 'ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آµ'}



                  </td>



                  <td className="px-3 py-2 text-left">



                    {formatPrice(item.total_value, 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†')}



                  </td>



                </tr>



              ))}



            </tbody>



          </table>



        ) : (




          <p className="text-xs text-[#7a6b4f]">ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾.</p>




        )}




      </section>









      {pnl?.start && pnl?.end && (



        <section className={`${retroPanel} p-4 text-xs text-[#7a6b4f]`}>



          <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’</p>



          <p className="mt-2">



            ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ² {isoToJalali(pnl.start ?? '')} ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ {isoToJalali(pnl.end ?? '')}



          </p>



        </section>



      )}



    </div>




  )




}









