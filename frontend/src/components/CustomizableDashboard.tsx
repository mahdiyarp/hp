import React, { useEffect, useState } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api'

interface Widget {
  id: number
  widget_type: string
  title?: string
  position_x: number
  position_y: number
  width: number
  height: number
  config?: string
  enabled: boolean
  order: number
}

interface LayoutItem {
  x: number
  y: number
  w: number
  h: number
  i: string
}

interface DashboardProps {
  isDragEnabled?: boolean
}

const WIDGET_TYPES = [
  { id: 'sales', label: 'فروش', color: '#4CAF50' },
  { id: 'invoices', label: 'فاکتورها', color: '#2196F3' },
  { id: 'payments', label: 'پرداخت‌ها', color: '#FF9800' },
  { id: 'inventory', label: 'موجودی', color: '#9C27B0' },
  { id: 'people', label: 'افراد', color: '#F44336' },
  { id: 'reports', label: 'گزارش‌ها', color: '#00BCD4' },
]

export default function CustomizableDashboard({ isDragEnabled = true }: DashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [availableWidgets, setAvailableWidgets] = useState(WIDGET_TYPES)

  useEffect(() => {
    loadWidgets()
  }, [])

  async function loadWidgets() {
    setLoading(true)
    try {
      const data = await apiGet<Widget[]>('/api/dashboard/widgets')
      setWidgets(data)
      
      // Convert widgets to layout format
      const layoutItems: LayoutItem[] = data.map(w => ({
        x: w.position_x,
        y: w.position_y,
        w: w.width,
        h: w.height,
        i: `widget-${w.id}`,
      }))
      setLayout(layoutItems)
    } catch (err) {
      console.error(err)
      setError('بارگذاری داشبورد ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  async function addWidget(widgetType: string) {
    try {
      await apiPost('/api/dashboard/widgets', {
        widget_type: widgetType,
        title: availableWidgets.find(w => w.id === widgetType)?.label,
        position_x: 0,
        position_y: 0,
        width: 3,
        height: 3,
      })
      await loadWidgets()
    } catch (err) {
      console.error(err)
      setError('افزودن widget ناموفق بود')
    }
  }

  async function removeWidget(widgetId: number) {
    if (!window.confirm('آیا این widget را حذف می‌کنید؟')) return
    
    try {
      await apiDelete(`/api/dashboard/widgets/${widgetId}`)
      await loadWidgets()
    } catch (err) {
      console.error(err)
      setError('حذف widget ناموفق بود')
    }
  }

  async function saveLayout(newLayout: LayoutItem[]) {
    try {
      const widgetsData = newLayout.map(item => ({
        widget_id: parseInt(item.i.replace('widget-', '')),
        position_x: item.x,
        position_y: item.y,
        width: item.w,
        height: item.h,
      }))

      await apiPost('/api/dashboard/widgets/reorder', { widgets: widgetsData })
      setLayout(newLayout)
    } catch (err) {
      console.error(err)
      setError('ذخیره ترتیب ناموفق بود')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 bg-[#faf4de]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin mb-3"></div>
          <p className="text-[#1f2e3b]">در حال بارگذاری داشبورد...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-[#faf4de] min-h-screen">
      {error && (
        <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="border-2 border-[#c5bca5] bg-[#faf4de] p-4 shadow-[4px_4px_0_#1f2e3b] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1f2e3b]">داشبورد قابل‌تنظیم</h2>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 border-2 font-bold shadow-[2px_2px_0_#1f2e3b] ${
              isEditMode
                ? 'bg-[#1f2e3b] text-[#faf4de] border-[#1f2e3b]'
                : 'bg-[#faf4de] text-[#1f2e3b] border-[#c5bca5]'
            }`}
          >
            {isEditMode ? 'ذخیره و خروج' : 'ویرایش'}
          </button>
        </div>

        {isEditMode && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {availableWidgets.map(wt => (
              <button
                key={wt.id}
                onClick={() => addWidget(wt.id)}
                className="px-3 py-2 text-sm border-2 border-[#c5bca5] bg-white text-[#1f2e3b] hover:bg-[#f5f1e8] font-semibold"
              >
                + {wt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard Grid */}
      {widgets.length > 0 ? (
        <GridLayout
          className="bg-white border-2 border-[#c5bca5]"
          layout={layout}
          onLayoutChange={isEditMode ? saveLayout : undefined}
          cols={12}
          rowHeight={100}
          width={1200}
          isDraggable={isEditMode && isDragEnabled}
          isResizable={isEditMode}
          containerPadding={[10, 10]}
          margin={[10, 10]}
        >
          {widgets.map(widget => (
            <div
              key={`widget-${widget.id}`}
              className="border-2 border-[#c5bca5] bg-[#faf4de] p-4 rounded"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1f2e3b]">{widget.title || widget.widget_type}</h3>
                {isEditMode && (
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* Widget Content */}
              <div className="h-full flex items-center justify-center text-[#7a6b4f] text-sm">
                <WidgetContent type={widget.widget_type} config={widget.config} />
              </div>
            </div>
          ))}
        </GridLayout>
      ) : (
        <div className="border-2 border-[#c5bca5] bg-[#faf4de] p-10 text-center rounded">
          <p className="text-[#7a6b4f] mb-4">هیچ widget برای نمایش وجود ندارد</p>
          {!isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="px-4 py-2 border-2 border-[#c5bca5] bg-[#faf4de] text-[#1f2e3b] hover:bg-white font-bold"
            >
              ویرایش و افزودن widget
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Widget Content Component
function WidgetContent({ type, config }: { type: string; config?: string }) {
  const getContent = () => {
    switch (type) {
      case 'sales':
        return '📊 فروش ماه جاری'
      case 'invoices':
        return '📄 فاکتورهای معلق'
      case 'payments':
        return '💰 پرداخت‌های انتظار'
      case 'inventory':
        return '📦 کالاهای کم‌موجود'
      case 'people':
        return '👥 مشتریان فعال'
      case 'reports':
        return '📈 گزارش‌های مالی'
      default:
        return type
    }
  }

  return <span>{getContent()}</span>
}
