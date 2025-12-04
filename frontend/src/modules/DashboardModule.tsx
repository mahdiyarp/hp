import React, { useEffect, useMemo, useState } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { apiGet, apiPost, apiPatch } from '../services/api'
import { formatNumberFa, isoToJalali } from '../utils/num'
import { parseJalaliInput } from '../utils/date'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'
import { useI18n } from '../i18n/I18nContext'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import SalesSummaryWidget from '../components/widgets/SalesSummaryWidget'
import FinancialSummaryWidget from '../components/widgets/FinancialSummaryWidget'
import SalesTrendWidget from '../components/widgets/SalesTrendWidget'
import KpiWidget from '../components/widgets/KpiWidget'
import QuickActionsWidget from '../components/widgets/QuickActionsWidget'

// ... (interfaces remain the same)

const ResponsiveGridLayout = WidthProvider(Responsive)

// A generic widget component
const Widget = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="h-full w-full border border-[#c5bca5] bg-[#faf4de] shadow-[3px_3px_0_#c5bca5] p-3 space-y-2 flex flex-col">
    <p className={retroHeading}>{title}</p>
    <div className="flex-1">{children}</div>
  </div>
)

export default function DashboardModule({
  smartDate,
  onSmartDateChange,
  onNavigate,
}: ModuleComponentProps) {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<'summary' | 'widgets'>('summary')
  // ... (state declarations remain the same)
  type DashboardWidget = {
    id: number;
    widget_type: string;
    title?: string | null;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    enabled: boolean;
  };
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [layout, setLayout] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [summary, setSummary] = useState<any | null>(null)
  const [trend, setTrend] = useState<any | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      // Try server-provided widgets; if unavailable, fall back to defaults
      let serverWidgets: DashboardWidget[] | null = null
      try {
        const data = await apiGet<DashboardWidget[]>('/api/dashboard/widgets')
        if (Array.isArray(data)) serverWidgets = data
      } catch (e) {
        serverWidgets = null
      }
      const initialWidgets: DashboardWidget[] = serverWidgets ?? [
        { id: 1, widget_type: 'sales_summary', title: 'خلاصه فروش', position_x: 0, position_y: 0, width: 6, height: 6, enabled: true },
        { id: 2, widget_type: 'financial_summary', title: 'خلاصه مالی', position_x: 6, position_y: 0, width: 6, height: 6, enabled: true },
        { id: 3, widget_type: 'sales_trend', title: 'روند فروش', position_x: 0, position_y: 6, width: 12, height: 8, enabled: true },
        { id: 4, widget_type: 'quick_actions', title: 'میانبرها', position_x: 0, position_y: 14, width: 12, height: 4, enabled: true },
      ]
      setWidgets(initialWidgets)

      // Load summary/trend; fall back to zeros if API not available
      try {
        const s = await apiGet<any>('/api/dashboard/summary')
        setSummary(s ?? null)
      } catch {
        setSummary({
          invoices: { today: 0, '7days': 0, month: 0 },
          receipts_today: 0,
          payments_today: 0,
          net_today: 0,
        })
      }
      try {
        const t = await apiGet<any>('/api/dashboard/sales-trend')
        setTrend(t ?? null)
      } catch {
        setTrend(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const newLayout = widgets.map(w => ({
      i: w.id.toString(),
      x: w.position_x,
      y: w.position_y,
      w: w.width,
      h: w.height,
    }))
    setLayout(newLayout)
  }, [widgets])

  const onLayoutChange = (newLayout: any[]) => {
    // This function can be used to save the new layout to the server
    console.log('Layout changed:', newLayout)
    // setLayout(newLayout)
  }
  
  // ... (other functions remain the same)

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} tracking-[0.4em] text-[#1f2e3b]`}>{t('loading_system')}</p>
        </div>
      </div>
    )
  }

  const ViewToggle = () => (
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <button
        onClick={() => setViewMode(prev => prev === 'summary' ? 'widgets' : 'summary')}
        className="px-4 py-2 border-2 border-[#c5bca5] bg-[#faf4de] text-[#1f2e3b] hover:bg-white font-bold"
      >
        {viewMode === 'summary' ? 'نمای تنظیم‌پذیر' : 'نمای خلاصه'}
      </button>
      {/* ... (item limit selector remains the same) */}
    </div>
  )

  return (
    <div className="space-y-4">
      <ViewToggle />
      {viewMode === 'widgets' ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          onLayoutChange={onLayoutChange}
        >
          {widgets.filter(w => w.enabled).map(w => (
            <div key={w.id.toString()} data-grid={{ i: w.id.toString(), x: w.position_x, y: w.position_y, w: w.width, h: w.height }}>
              {w.widget_type === 'sales_summary' && <SalesSummaryWidget summary={summary} />}
              {w.widget_type === 'financial_summary' && <FinancialSummaryWidget summary={summary} />}
              {w.widget_type === 'sales_trend' && <SalesTrendWidget trend={trend} onRefresh={loadDashboardData} />}
              {w.widget_type === 'kpi' && <KpiWidget title={w.title || ''} value={0} unit="" />}
              {w.widget_type === 'quick_actions' && <QuickActionsWidget onNavigate={onNavigate} />}
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiWidget title="فروش امروز" value={summary?.invoices.today || 0} unit="فاکتور" />
            <KpiWidget title="دریافتی امروز" value={summary?.receipts_today || 0} unit="ریال" />
            <KpiWidget title="پرداختی امروز" value={summary?.payments_today || 0} unit="ریال" />
            <KpiWidget title="خالص جریان نقدی" value={summary?.net_today || 0} unit="ریال" />
          </div>
          <QuickActionsWidget onNavigate={onNavigate} />
          {/* ... (the rest of the summary view) */}
        </div>
      )}
    </div>
  )
}


