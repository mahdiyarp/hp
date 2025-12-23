const frontendOnlyFlag = String((import.meta as any)?.env?.VITE_FRONTEND_ONLY ?? '').toLowerCase()

export const isFrontendOnlyMode = frontendOnlyFlag === 'true' || frontendOnlyFlag === '1'

type SettingKV = { key: string; value: string; category?: string }
type SmsHistoryEntry = {
  id: string
  created_at: string
  status: 'queued' | 'sent' | 'failed' | 'delivered'
  provider: 'sms.ir' | 'ippanel'
  recipient: string
  message: string
  latency_ms: number
  response_message?: string
}

type ActivityLog = {
  id: number
  created_at: string
  username: string
  method: string
  path: string
  status_code: number
  detail: string
}

export const DEMO_USER = {
  id: 501,
  username: 'demo.dev',
  role: 'Developer NFT',
  otp_enabled: false,
}

export const DEMO_MODULE_IDS = [
  'dashboard',
  'reports',
  'roadmap',
  'sales',
  'finance',
  'inventory',
  'people',
  'settings',
  'settings-users',
  'banks',
  'developer',
  'page-builder',
  'dev-assistant',
  'sms-panel',
  'papi-panel',
  'audit',
]

export const DEMO_PERMISSIONS = [
  'reports:view',
  'invoices:view',
  'payments:view',
  'products:view',
  'persons:view',
  'settings:view',
  'settings:manage',
]

export const DEMO_FEATURES = ['reports', 'invoices', 'payments', 'products', 'persons', 'settings']

const initialSettings: SettingKV[] = [
  { key: 'company_name', value: 'هولدینگ حساب پاک' },
  { key: 'sms_provider', value: 'sms.ir' },
  { key: 'smsir_line_number', value: '30007777' },
  { key: 'smsir_api_key', value: 'DEMO-KEY-123' },
  { key: 'roadmap_json_url', value: 'https://demo.hesabpak.ir/roadmap.json' },
]

let settings: SettingKV[] = [...initialSettings]

const mockActivities: ActivityLog[] = Array.from({ length: 6 }).map((_, idx) => ({
  id: idx + 1,
  created_at: new Date(Date.now() - idx * 3600_000).toISOString(),
  username: idx % 2 === 0 ? 'developer' : 'nazer',
  method: idx % 2 === 0 ? 'GET' : 'PATCH',
  path: idx % 2 === 0 ? '/api/admin/analytics/user-party-sync' : '/api/admin/settings/sms_provider',
  status_code: 200,
  detail: idx % 2 === 0 ? 'بازخوانی گزارش' : 'به‌روزرسانی تنظیمات پیامک',
}))

const smsLines = ['30007777', '50002000', '021910090']

const smsHistorySeed: SmsHistoryEntry[] = Array.from({ length: 18 }).map((_, idx) => {
  const status: SmsHistoryEntry['status'] =
    idx % 5 === 0 ? 'failed' : idx % 3 === 0 ? 'delivered' : 'sent'
  const latency = status === 'failed' ? 0 : 350 + (idx % 4) * 120
  const day = new Date()
  day.setDate(day.getDate() - Math.floor(idx / 3))
  return {
    id: `sms-${idx + 1}`,
    created_at: new Date(day.getTime() - (idx % 3) * 600000).toISOString(),
    status,
    provider: idx % 4 === 0 ? 'ippanel' : 'sms.ir',
    recipient: `09${12000000 + idx}`,
    message: idx % 2 === 0 ? 'پیام تایید فاکتور' : 'پیام یادآوری بدهی',
    latency_ms: latency,
    response_message: status === 'failed' ? 'Rejected by provider' : 'OK',
  }
})

let smsHistory: SmsHistoryEntry[] = [...smsHistorySeed]

const userPartySyncDemo = {
  total_users: 124,
  mobile_users: 110,
  missing_mobile_users: 14,
  linked_users: 96,
  linked_parties: 102,
  orphan_parties_count: 8,
  coverage_percent: 87,
  unlinked_users_total: 14,
  orphan_parties_total: 12,
  sample_limit: 5,
  generated_at: new Date().toISOString(),
  top_unlinked_users: Array.from({ length: 5 }).map((_, idx) => ({
    id: idx + 1,
    username: `user${idx + 1}`,
    mobile: `0912000${(100 + idx).toString()}`,
  })),
  top_orphan_parties: Array.from({ length: 5 }).map((_, idx) => ({
    id: `party-${idx + 1}`,
    name: `شرکت همکار ${idx + 1}`,
    mobile: `0912100${(200 + idx).toString()}`,
  })),
}

const demoNow = new Date('2025-12-23T08:30:00Z')

const demoFinancialAutoContext = {
  context: {
    current_financial_year: {
      id: 1404,
      name: 'سال مالی ۱۴۰۴',
      start_date: '2025-03-20',
      end_date: '2026-03-20',
      start_date_jalali: '1404/01/01',
      end_date_jalali: '1405/01/01',
      is_closed: false,
    },
    current_jalali: {
      year: 1404,
      month: 10,
      day: 3,
      formatted: '1404/10/03',
    },
    auto_created: true,
  },
  date_suggestions: {
    today: '1404/10/03',
    month_start: '1404/10/01',
    quarter_start: '1404/07/01',
    year_start: '1404/01/01',
    year_end: '1404/12/29',
    year_start_iso: '2025-03-20',
    year_end_iso: '2026-03-19',
  },
}

const demoSummary = {
  invoices: { today: 5, '7days': 32, month: 96 },
  receipts_today: 284_000_000,
  payments_today: 196_000_000,
  net_today: 88_000_000,
  cash_balances: {
    main: 1_240_000_000,
    bank_melli: 420_000_000,
    bank_mellat: 180_000_000,
  },
}

const demoInvoices = Array.from({ length: 12 }).map((_, idx) => ({
  id: 9000 + idx,
  invoice_number: `INV-${1404}-${idx + 101}`,
  party_name: idx % 2 === 0 ? 'شرکت راهبر' : 'صنایع نوین',
  total: 12_000_000 + idx * 3_500_000,
  status: idx % 3 === 0 ? 'paid' : 'pending',
  server_time: new Date(Date.now() - idx * 3600_000).toISOString(),
  invoice_type: idx % 2 === 0 ? 'sale' : 'purchase',
}))

const demoProducts = Array.from({ length: 12 }).map((_, idx) => ({
  id: `SKU-${idx + 101}`,
  name: `محصول ویژه ${idx + 1}`,
  unit: 'عدد',
  group: idx % 2 === 0 ? 'الکترونیک' : 'مالی',
  inventory: 120 - idx * 3,
}))

const demoOldStock = Array.from({ length: 8 }).map((_, idx) => ({
  product_id: `SKU-${idx + 10}`,
  name: `کالای مانده ${idx + 1}`,
  inventory: 20 + idx * 4,
  last_price_at: new Date(Date.now() - idx * 86400_000).toISOString(),
}))

const demoChecksDue = Array.from({ length: 5 }).map((_, idx) => ({
  id: 4000 + idx,
  payment_number: `CHK-${idx + 1}`,
  party_name: idx % 2 === 0 ? 'شرکت راهبر' : 'صنایع نوین',
  amount: 15_000_000 + idx * 5_000_000,
  due_date: new Date(Date.now() + idx * 86400_000).toISOString(),
  status: 'pending',
}))

const demoPersons = Array.from({ length: 15 }).map((_, idx) => ({
  id: `person-${idx + 1}`,
  name: idx % 2 === 0 ? `شرکت راهبر ${idx + 1}` : `مشتری ممتاز ${idx + 1}`,
  mobile: `09123${(500000 + idx).toString()}`,
}))

const demoPrices = {
  fx: {
    USD: 580_000,
    EUR: 612_000,
  },
  crypto: {
    BTC: { usd: 41_200 },
    ETH: { usd: 2_200 },
  },
}

let dashboardWidgets = [
  {
    id: 1,
    widget_type: 'payments',
    title: 'گردش نقدی',
    position_x: 0,
    position_y: 0,
    width: 3,
    height: 3,
    enabled: true,
    order: 0,
  },
  {
    id: 2,
    widget_type: 'products',
    title: 'محصولات پرفروش',
    position_x: 3,
    position_y: 0,
    width: 3,
    height: 3,
    enabled: true,
    order: 1,
  },
]

let widgetCounter = 100

const roadmapDemo = {
  title: 'نقشه‌راه عملیاتی زمستان ۱۴۰۴',
  updated_at: new Date().toISOString(),
  sections: [
    {
      title: 'یکپارچه‌سازی بانکی',
      bodyText: 'تکمیل اتصال به سامانه‌های پرداخت و گزارش‌گیری برخط.',
      checklists: [
        { text: 'قرارداد بانک ملت امضا شد', done: true },
        { text: 'اتصال بانک سپه', done: false },
      ],
    },
    {
      title: 'بهبود عملکرد انبار',
      bodyText: 'نمایش realtime و همگام‌سازی با CRM',
      checklists: [
        { text: 'داشبورد لجستیک', done: true },
        { text: 'Export CSV پیشرفته', done: false },
      ],
    },
  ],
}

const auditBatch = {
  ts: new Date(Date.now() - 3600_000).toISOString(),
  merkle_root: '0xDEMOCAFEBEEF0011223344',
  count: 42,
  entry_ids: [101, 102, 103],
}

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function parseJsonBody(init?: RequestInit) {
  if (!init?.body) return undefined
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body)
    } catch {
      return undefined
    }
  }
  if (init.body instanceof FormData) {
    const obj: Record<string, any> = {}
    init.body.forEach((val, key) => {
      obj[key] = val
    })
    return obj
  }
  return undefined
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length
  const start = (page - 1) * limit
  const slice = items.slice(start, start + limit)
  return { items: slice, total, page, limit }
}

function computeDailyPoints() {
  const grouped = new Map<string, { sent: number; failed: number; avgLatency: number; samples: number }>()
  smsHistory.forEach((entry) => {
    const day = entry.created_at.slice(0, 10)
    const bucket = grouped.get(day) || { sent: 0, failed: 0, avgLatency: 0, samples: 0 }
    if (entry.status === 'sent' || entry.status === 'delivered') {
      bucket.sent += 1
      if (entry.latency_ms > 0) {
        bucket.avgLatency += entry.latency_ms
        bucket.samples += 1
      }
    } else if (entry.status === 'failed') {
      bucket.failed += 1
    }
    grouped.set(day, bucket)
  })
  const days = Array.from(grouped.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([day, info]) => ({
      day,
      ok: info.sent,
      fail: info.failed,
      avg_latency_ms: info.samples ? Math.round(info.avgLatency / info.samples) : 0,
      total: info.sent + info.failed,
      sent: info.sent,
      failed: info.failed,
    }))
  return days
}

function normalizePath(path: string) {
  if (!path.startsWith('/')) {
    try {
      const url = new URL(path)
      return url.pathname + (url.search || '')
    } catch {
      return '/' + path
    }
  }
  return path
}

function jsonResponse(payload: any): any {
  return deepClone(payload)
}

function nextWidgetId() {
  widgetCounter += 1
  return widgetCounter
}

export async function mockApiRequest<T = any>(
  path: string,
  method: string = 'GET',
  init?: RequestInit,
): Promise<T> {
  await delay()
  const normalized = normalizePath(path)
  const url = new URL(normalized, 'https://demo.local')
  const { pathname, searchParams } = url
  const upperMethod = method.toUpperCase()

  if (upperMethod === 'GET' && pathname === '/api/version') {
    return jsonResponse({ version: 'v2025.12-demo', git_hash: 'frontend-only' })
  }

  if (upperMethod === 'GET' && pathname === '/health') {
    return 'ok' as T
  }

  if (upperMethod === 'GET' && pathname === '/api/time/now') {
    return jsonResponse({
      utc: new Date(demoNow).toISOString(),
      server_offset_seconds: 0,
      server_offset: '+00:00',
      server_local: new Date(demoNow).toISOString(),
      jalali: '1404/10/03',
      epoch_ms: demoNow.getTime(),
    })
  }

  if (upperMethod === 'POST' && pathname === '/api/time/sync') {
    return jsonResponse({ ok: true })
  }

  if (upperMethod === 'GET' && pathname === '/api/financial/auto-context') {
    return jsonResponse(demoFinancialAutoContext)
  }

  if (upperMethod === 'GET' && pathname === '/api/dashboard/summary') {
    return jsonResponse(demoSummary)
  }

  if (upperMethod === 'GET' && pathname === '/api/invoices') {
    const limit = Number(searchParams.get('limit') || '50')
    return jsonResponse(demoInvoices.slice(0, limit))
  }

  if (upperMethod === 'GET' && pathname === '/api/products') {
    const limit = Number(searchParams.get('limit') || '50')
    return jsonResponse(demoProducts.slice(0, limit))
  }

  if (upperMethod === 'GET' && pathname === '/api/dashboard/old-stock') {
    return jsonResponse(demoOldStock)
  }

  if (upperMethod === 'GET' && pathname === '/api/dashboard/checks-due') {
    return jsonResponse(demoChecksDue)
  }

  if (upperMethod === 'GET' && pathname === '/api/dashboard/prices') {
    return jsonResponse(demoPrices)
  }

  if (upperMethod === 'GET' && pathname === '/api/persons') {
    return jsonResponse(demoPersons)
  }

  if (upperMethod === 'GET' && pathname === '/api/dashboard/widgets') {
    return jsonResponse(dashboardWidgets)
  }

  if (upperMethod === 'POST' && pathname === '/api/dashboard/widgets') {
    const payload = parseJsonBody(init) || {}
    const widget = {
      id: nextWidgetId(),
      widget_type: payload.widget_type || 'custom',
      title: payload.title || 'ویجت جدید',
      position_x: payload.position_x ?? 0,
      position_y: payload.position_y ?? dashboardWidgets.length,
      width: payload.width ?? 3,
      height: payload.height ?? 3,
      enabled: payload.enabled ?? true,
      order: dashboardWidgets.length,
    }
    dashboardWidgets = [...dashboardWidgets, widget]
    return jsonResponse(widget)
  }

  if (upperMethod === 'PATCH' && pathname.startsWith('/api/dashboard/widgets/')) {
    const id = Number(pathname.split('/').pop())
    const payload = parseJsonBody(init) || {}
    dashboardWidgets = dashboardWidgets.map((w) => (w.id === id ? { ...w, ...payload } : w))
    return jsonResponse({ ok: true })
  }

  if (upperMethod === 'POST' && pathname.endsWith('/reorder')) {
    const payload = parseJsonBody(init)
    const widgets = payload?.widgets
    if (Array.isArray(widgets)) {
      widgets.forEach((update: any) => {
        dashboardWidgets = dashboardWidgets.map((w) =>
          w.id === update.widget_id
            ? { ...w, position_x: update.position_x, position_y: update.position_y }
            : w,
        )
      })
    }
    dashboardWidgets.sort((a, b) => a.position_y - b.position_y)
    return jsonResponse({ ok: true })
  }

  if (upperMethod === 'POST' && pathname.startsWith('/api/dashboard/widgets/')) {
    const id = Number(pathname.split('/').pop())
    dashboardWidgets = dashboardWidgets.filter((w) => w.id !== id)
    return jsonResponse({ ok: true })
  }

  if (upperMethod === 'GET' && pathname === '/api/roadmap') {
    return jsonResponse(roadmapDemo)
  }

  if (upperMethod === 'GET' && pathname === '/api/reports/sales-trend') {
    const points = Array.from({ length: 6 }).map((_, idx) => ({
      label: `روز ${idx + 1}`,
      value: 10 + idx * 4,
    }))
    return jsonResponse({ points })
  }

  if (upperMethod === 'GET' && pathname === '/api/audit/otp/batch/latest') {
    return jsonResponse(auditBatch)
  }

  if (upperMethod === 'GET' && pathname === '/api/audit/otp/proof') {
    return jsonResponse({ chain_is_valid: true, merkle_root: auditBatch.merkle_root })
  }

  if (upperMethod === 'GET' && pathname === '/api/audit/otp/batch/build') {
    return jsonResponse({ status: 'queued' })
  }

  if (upperMethod === 'GET' && pathname === '/api/admin/activity') {
    const limit = Number(searchParams.get('limit') || '50')
    return jsonResponse(mockActivities.slice(0, limit))
  }

  if (upperMethod === 'GET' && pathname === '/api/admin/settings') {
    return jsonResponse(settings)
  }

  if (upperMethod === 'PATCH' && pathname.startsWith('/api/admin/settings/')) {
    const key = decodeURIComponent(pathname.replace('/api/admin/settings/', ''))
    const payload = parseJsonBody(init)
    const value = payload?.value ?? ''
    const existing = settings.find((s) => s.key === key)
    if (existing) {
      existing.value = String(value)
    } else {
      settings.push({ key, value: String(value) })
    }
    return jsonResponse({ key, value: String(value) })
  }

  if (upperMethod === 'DELETE' && pathname.startsWith('/api/admin/settings/')) {
    const key = decodeURIComponent(pathname.replace('/api/admin/settings/', ''))
    settings = settings.filter((s) => s.key !== key)
    return jsonResponse({ ok: true })
  }

  if (upperMethod === 'GET' && pathname === '/api/admin/analytics/user-party-sync') {
    const limit = Number(searchParams.get('sample_limit') || searchParams.get('limit') || '5')
    return jsonResponse({
      ...userPartySyncDemo,
      sample_limit: limit,
      generated_at: new Date().toISOString(),
      top_unlinked_users: userPartySyncDemo.top_unlinked_users.slice(0, limit),
      top_orphan_parties: userPartySyncDemo.top_orphan_parties.slice(0, limit),
    })
  }

  if (upperMethod === 'GET' && pathname === '/api/org/features') {
    return jsonResponse({ features: DEMO_FEATURES })
  }

  if (upperMethod === 'GET' && pathname === '/api/auth/me') {
    return jsonResponse(DEMO_USER)
  }

  if (upperMethod === 'POST' && pathname === '/api/auth/logout') {
    return jsonResponse({ success: true })
  }

  if (upperMethod === 'GET' && pathname === '/api/current-user/modules') {
    return jsonResponse(DEMO_MODULE_IDS)
  }

  if (upperMethod === 'GET' && pathname === '/api/current-user/permissions') {
    return jsonResponse(DEMO_PERMISSIONS.map((name, idx) => ({
      id: 7000 + idx,
      name,
      description: `مجوز ${name}`,
      module: 'demo',
    })))
  }

  if (upperMethod === 'GET' && pathname === '/api/admin/settings/sms_profiles') {
    return jsonResponse({ value: '[]' })
  }

  if (upperMethod === 'GET' && pathname === '/api/sms/history') {
    let filtered = [...smsHistory]
    const status = searchParams.get('status')
    const provider = searchParams.get('provider')
    const q = searchParams.get('q')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (status) filtered = filtered.filter((h) => h.status === status)
    if (provider) filtered = filtered.filter((h) => h.provider === provider)
    if (q) filtered = filtered.filter((h) => h.message.includes(q) || h.recipient.includes(q))
    if (from) filtered = filtered.filter((h) => h.created_at >= from)
    if (to) filtered = filtered.filter((h) => h.created_at <= to + 'T23:59:59Z')
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '20')
    const paged = paginate(filtered, Math.max(1, page), Math.max(1, limit))
    return jsonResponse(paged)
  }

  if (upperMethod === 'POST' && pathname === '/api/sms/send') {
    const payload = parseJsonBody(init) || {}
    const now = new Date()
    const entry: SmsHistoryEntry = {
      id: `sms-${Date.now()}`,
      created_at: now.toISOString(),
      status: 'sent',
      provider: payload.provider === 'ippanel' ? 'ippanel' : 'sms.ir',
      recipient: payload.mobile || payload.to || '09120000000',
      message: payload.message || 'پیام دمو',
      latency_ms: 420,
      response_message: 'Mock accepted',
    }
    smsHistory = [entry, ...smsHistory].slice(0, 200)
    return jsonResponse({ id: entry.id, status: 'queued', provider: entry.provider })
  }

  if (upperMethod === 'POST' && pathname === '/api/smsir/test-otp') {
    return jsonResponse({ status: 'ok', message: 'OTP accepted در حالت دمو' })
  }

  if (upperMethod === 'GET' && pathname === '/api/sms/metrics/daily') {
    const points = computeDailyPoints()
    return jsonResponse({ days: points.length, points, items: points })
  }

  throw new Error(`Mock API پاسخ‌گوی ${upperMethod} ${pathname} نیست؛ بک‌اند را اجرا کنید.`)
}

export async function mockFetchResponse(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const path = typeof input === 'string' ? input : input.toString()
  const method = init?.method || 'GET'
  try {
    const data = await mockApiRequest(path, method, init)
    if (typeof data === 'string') {
      return new Response(data, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mock API error'
    return new Response(JSON.stringify({ detail: message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
