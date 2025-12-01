const express = require('express')
const cors = require('cors')
const { toJalaali } = require('jalaali-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const pad2 = value => String(value).padStart(2, '0')
const now = () => new Date()
const formatJalali = value => {
  const date = typeof value === 'string' ? new Date(value) : value
  const jalali = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return `${jalali.jy}/${pad2(jalali.jm)}/${pad2(jalali.jd)}`
}

const roadmapFilePath = path.join(__dirname, '..', 'DEVELOPMENT_ROADMAP.md')

const parseRoadmap = content => {
  const lines = content.split(/\r?\n/)
  let title = 'HesabPak Roadmap'
  const sections = []
  let current = null
  lines.forEach(line => {
    if (line.startsWith('# ') && title === 'HesabPak Roadmap') {
      title = line.replace('#', '').trim()
      return
    }
    if (line.startsWith('## ')) {
      if (current) {
        sections.push({
          title: current.title,
          bodyText: current.body.join('\n').trim(),
          checklists: current.checklists,
        })
      }
      current = { title: line.replace(/^##\s+/, '').trim(), body: [], checklists: [] }
      return
    }
    if (!current) {
      return
    }
    const trimmed = line.trim()
    if (/^- \[[ xX]\]/.test(trimmed)) {
      current.checklists.push({
        text: trimmed.replace(/^- \[[ xX]\]\s*/, '').trim(),
        done: /\[[xX]\]/.test(trimmed),
      })
      return
    }
    current.body.push(line)
  })
  if (current) {
    sections.push({
      title: current.title,
      bodyText: current.body.join('\n').trim(),
      checklists: current.checklists,
    })
  }
  return { title, sections }
}

const readRoadmap = () => {
  try {
    const markdown = fs.readFileSync(roadmapFilePath, 'utf8')
    const stats = fs.statSync(roadmapFilePath)
    return {
      ...parseRoadmap(markdown),
      markdown,
      updated_at: stats.mtime.toISOString(),
    }
  } catch (error) {
    console.warn('Roadmap file unavailable', error.message)
    return null
  }
}

let widgetCounter = 3
const modulesList = ['dashboard', 'roadmap', 'sales', 'finance', 'inventory', 'people', 'reports', 'settings']
const permissionsList = [
  { id: 1, name: 'finance.view', description: 'مشاهده امور مالی', module: 'finance' },
  { id: 2, name: 'sales.manage', description: 'مدیریت فروش', module: 'sales' },
  { id: 3, name: 'inventory.view', description: 'مشاهده کالاها', module: 'inventory' },
  { id: 4, name: 'reports.access', description: 'دسترسی به گزارش‌ها', module: 'reports' },
]

const users = [
  { id: 1, username: 'mehdi_pakzamir', email: 'mahdiyar@gmail.com', full_name: 'مهندس پاک‌ضمیر', role_id: 1, is_active: true },
  { id: 2, username: 'accountant', email: 'accountant@hp.local', full_name: 'حسابدار سامانه', role_id: 2, is_active: true },
]

const roles = [
  { id: 1, name: 'Admin', description: 'دسترسی کامل به تمام ماژول‌ها' },
  { id: 2, name: 'Accountant', description: 'مدیریت امور مالی و گزارش‌ها' },
]

const paymentMethods = [
  { id: 1, key: 'cash', name: 'نقدی', parent_id: null, enabled: true, order: 1, account: 'cash_account', is_cheque: false },
  { id: 2, key: 'bank', name: 'حواله بانکی', parent_id: null, enabled: true, order: 2, account: 'bank_account', is_cheque: false },
  { id: 3, key: 'cheque', name: 'چک', parent_id: null, enabled: true, order: 3, account: 'cheque_account', is_cheque: true },
]

const products = [
  { id: 'prod-1', name: 'کفش مدیریتی', unit: 'جفت', group: 'پوشاک', inventory: 42, unit_price: 815000, last_purchase_price: 730000, last_sale_price: 815000 },
  { id: 'prod-2', name: 'کارت هدیه طلایی', unit: 'عدد', group: 'هدایا', inventory: 125, unit_price: 120000, last_purchase_price: 100000, last_sale_price: 120000 },
  { id: 'prod-3', name: 'دفتر راهبر', unit: 'دفتر', group: 'دفترچه', inventory: 80, unit_price: 42000, last_purchase_price: 38000, last_sale_price: 42000 },
]

const persons = [
  { id: 'person-1', name: 'شرکت طلوع افق', mobile: '09120000001', kind: 'customer' },
  { id: 'person-2', name: 'گروه تامین نگر', mobile: '09120000002', kind: 'supplier' },
  { id: 'person-3', name: 'سارا رضایی', mobile: '09120000003', kind: 'contact' },
]

const invoices = [
  {
    id: 1,
    invoice_number: 'INV-2024-001',
    invoice_type: 'sale',
    party_id: 'person-1',
    party_name: 'شرکت طلوع افق',
    subtotal: 850000,
    total: 900000,
    status: 'final',
    server_time: now().toISOString(),
    client_time: now().toISOString(),
    mode: 'manual',
    note: 'پیش‌فاکتور به فاکتور نهایی تبدیل‌شده',
    items: [
      { id: 1, description: 'کفش مدیریتی', quantity: 2, unit: 'جفت', unit_price: 400000, total: 800000 },
      { id: 2, description: 'دفتر راهبر', quantity: 1, unit: 'دفتر', unit_price: 50000, total: 50000 },
    ],
  },
  {
    id: 2,
    invoice_number: 'INV-2024-002',
    invoice_type: 'purchase',
    party_id: 'person-2',
    party_name: 'گروه تامین نگر',
    subtotal: 450000,
    total: 450000,
    status: 'draft',
    server_time: new Date(Date.now() - 1000 * 3600 * 6).toISOString(),
    client_time: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
    mode: 'manual',
    note: 'سفارش به تأمین‌کننده',
    items: [{ id: 3, description: 'کارت هدیه طلایی', quantity: 3, unit: 'عدد', unit_price: 150000, total: 450000 }],
  },
]

const payments = [
  {
    id: 1,
    payment_number: 'PAY-001',
    direction: 'in',
    method: 'cash',
    party_name: 'شرکت طلوع افق',
    amount: 900000,
    status: 'posted',
    server_time: now().toISOString(),
    due_date: null,
    note: 'پرداخت نهایی فاکتور INV-2024-001',
    invoice_id: 1,
  },
  {
    id: 2,
    payment_number: 'PAY-002',
    direction: 'out',
    method: 'cheque',
    party_name: 'گروه تامین نگر',
    amount: 300000,
    status: 'draft',
    server_time: now().toISOString(),
    due_date: new Date(Date.now() + 1000 * 3600 * 24 * 7).toISOString(),
    note: 'چک پرداختی به تأمین‌کننده',
    invoice_id: 2,
  },
]

const customerGroups = [
  { id: 1, name: 'مشتریان طلایی', description: 'مشتریان بزرگ', members: ['person-1'] },
]

const activitiesByPerson = {
  'person-1': [
    { id: 1, person_id: 'person-1', kind: 'call', content: 'تماس اولیه موفق', created_at: now().toISOString(), created_by: 1, next_action_at: null },
  ],
}

let dashboardWidgets = [
  { id: 1, widget_type: 'payments', title: 'جریان نقدی', position_x: 0, position_y: 0, width: 2, height: 1, enabled: true, order: 1 },
  { id: 2, widget_type: 'invoices', title: 'فاکتورهای اخیر', position_x: 2, position_y: 0, width: 2, height: 1, enabled: true, order: 2 },
]

let backupCounter = 2
const backups = [
  { id: 1, filename: 'hp-backup-full-2024-10-01.zip', kind: 'daily', created_at: now().toISOString(), size_bytes: 1024 * 1024 * 90, note: 'بکاپ کامل شب گذشته' },
]

const integrations = [
  { id: 1, name: 'WhatsApp Broadcast', provider: 'twilio', enabled: true, last_synced_at: now().toISOString() },
  { id: 2, name: 'Telegram Alerts', provider: 'telegram-bot', enabled: false, last_synced_at: null },
]

const systemSettings = [
  { id: 1, key: 'company.name', value: 'حساب‌پاک بزرگ', setting_type: 'text', display_name: 'نام شرکت', description: 'نام ظاهری روی فاکتورها', category: 'company', is_secret: false, created_at: now().toISOString(), updated_at: now().toISOString() },
  { id: 2, key: 'finance.currency', value: 'IRR', setting_type: 'text', display_name: 'واحد پول', description: 'واحد پول پیش‌فرض', category: 'finance', is_secret: false, created_at: now().toISOString(), updated_at: now().toISOString() },
  { id: 3, key: 'payments.qr.enabled', value: 'true', setting_type: 'boolean', display_name: 'فعال‌سازی QR', description: 'QR برای پرداخت سریع', category: 'payments', is_secret: false, created_at: now().toISOString(), updated_at: now().toISOString() },
]

const userPreferences = {
  language: 'fa',
  sidebarSide: 'right',
  sidebarOrder: [...modulesList],
}

const blockchainEntries = []

const createHash = value => crypto.createHash('sha256').update(value).digest('hex')

const findPreviousEntry = (entityType, entityId) => {
  for (let i = blockchainEntries.length - 1; i >= 0; i -= 1) {
    const entry = blockchainEntries[i]
    if (entry.entity_type === entityType && entry.entity_id === String(entityId)) {
      return entry
    }
  }
  return null
}

const verifyEntityChainEntries = entries => {
  if (!entries.length) return { ok: true, message: 'No entries' }
  for (let i = 1; i < entries.length; i += 1) {
    if (entries[i].previous_hash !== entries[i - 1].current_hash) {
      return { ok: false, message: `Mismatch at entry ${entries[i].id}`, index: i }
    }
  }
  return { ok: true, message: 'Chain valid' }
}

const createBlockchainEntry = (entityType, entityId, action, data) => {
  const payload = JSON.stringify(data ?? {})
  const dataHash = createHash(payload)
  const previousEntry = findPreviousEntry(entityType, entityId)
  const previousHash = previousEntry ? previousEntry.current_hash : null
  const currentHash = createHash(`${entityType}:${entityId}:${action}:${payload}:${Date.now()}`)
  const entry = {
    id: blockchainEntries.length + 1,
    entity_type: entityType,
    entity_id: String(entityId),
    action,
    data_hash: dataHash,
    previous_hash: previousHash,
    current_hash: currentHash,
    timestamp: new Date().toISOString(),
    user_id: 1,
  }
  blockchainEntries.push(entry)
  return entry
}

const verifyBlockchain = () => {
  const summary = verifyEntityChainEntries(blockchainEntries)
  for (let i = 1; i < blockchainEntries.length; i += 1) {
    if (blockchainEntries[i - 1].current_hash !== blockchainEntries[i].previous_hash) {
      return { ok: false, index: i, detail: 'Chain broken', entry: blockchainEntries[i] }
    }
  }
  return { ok: summary.ok, total: blockchainEntries.length, detail: summary.message }
}

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from hesabpak backend!' })
})

app.get('/api/version', (req, res) => {
  res.json({ version: '2.0.0' })
})

app.get('/api/time/now', (req, res) => {
  const current = now()
  const jalali = formatJalali(current)
  res.json({
    utc: current.toISOString(),
    server_offset_seconds: -current.getTimezoneOffset() * 60,
    server_offset: current.toTimeString().split(' ')[1] || null,
    server_local: current.toLocaleString('fa-IR'),
    jalali,
    epoch_ms: current.getTime(),
  })
})

app.post('/api/time/sync', (req, res) => {
  res.status(204).end()
})

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body
  res.json({ access_token: 'access-token', refresh_token: 'refresh-token', otp_required: false })
})

app.post('/api/auth/refresh', (req, res) => {
  res.json({ access_token: 'access-token', refresh_token: 'refresh-token' })
})

app.post('/api/auth/logout', (req, res) => {
  res.status(204).end()
})

app.get('/api/auth/me', (req, res) => {
  res.json({ id: 1, username: 'mehdi_pakzamir', role: 'Developer', otp_enabled: false })
})

app.post('/api/auth/otp/setup', (req, res) => res.json({ setup: true }))
app.post('/api/auth/otp/verify', (req, res) => res.json({ verified: true }))
app.post('/api/auth/otp/disable', (req, res) => res.json({ disabled: true }))

app.post('/api/auth/register-mobile-otp', (req, res) => res.json({ session_id: 'otp-session', detail: 'OTP sent' }))
app.post('/api/auth/register-mobile-verify', (req, res) => res.json({ success: true }))

app.get('/api/current-user/modules', (req, res) => {
  res.json(modulesList)
})

app.get('/api/current-user/permissions', (req, res) => {
  res.json(permissionsList)
})

app.get('/api/users/preferences', (req, res) => res.json({ language: userPreferences.language }))
app.put('/api/users/preferences', (req, res) => {
  const { language } = req.body
  if (language) userPreferences.language = language
  res.json({ success: true })
})

app.get('/api/users/preferences/sidebar-side', (req, res) => res.json(userPreferences.sidebarSide))
app.post('/api/users/preferences/sidebar-side', (req, res) => {
  const side = req.body.side
  if (side === 'left' || side === 'right') userPreferences.sidebarSide = side
  res.json({ success: true })
})

app.get('/api/users/preferences/sidebar-order', (req, res) => res.json(userPreferences.sidebarOrder))
app.post('/api/users/preferences/sidebar-order', (req, res) => {
  const { order } = req.body
  if (Array.isArray(order)) {
    userPreferences.sidebarOrder = order.filter(id => modulesList.includes(id))
  }
  res.json({ success: true })
})

app.get('/api/payment-methods', (req, res) => res.json(paymentMethods))
app.post('/api/payment-methods', (req, res) => {
  const nextId = paymentMethods.length ? Math.max(...paymentMethods.map(m => m.id)) + 1 : 1
  const payload = req.body
  const newMethod = {
    id: nextId,
    key: payload.key || `method-${nextId}`,
    name: payload.name || 'روش جدید',
    parent_id: payload.parent_id ?? null,
    enabled: payload.enabled ?? true,
    order: payload.order ?? (paymentMethods.length + 1) * 10,
    account: payload.account ?? 'account-' + nextId,
    is_cheque: payload.is_cheque ?? false,
  }
  paymentMethods.push(newMethod)
  res.status(201).json(newMethod)
})

app.patch('/api/payment-methods/:id', (req, res) => {
  const id = Number(req.params.id)
  const method = paymentMethods.find(m => m.id === id)
  if (!method) return res.status(404).json({ detail: 'Not found' })
  Object.assign(method, req.body)
  res.json(method)
})

app.delete('/api/payment-methods/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = paymentMethods.findIndex(m => m.id === id)
  if (index === -1) return res.status(404).json({ detail: 'Not found' })
  paymentMethods.splice(index, 1)
  res.status(204).end()
})

app.get('/api/products', (req, res) => {
  const limit = Number(req.query.limit) || products.length
  res.json(products.slice(0, limit))
})

app.post('/api/products', (req, res) => {
  const nextId = `prod-${products.length + 1}`
  const payload = req.body
  const product = {
    id: nextId,
    name: payload.name || 'محصول جدید',
    unit: payload.unit || 'عدد',
    group: payload.group || 'سایر',
    inventory: payload.inventory ?? 0,
    unit_price: payload.unit_price ?? 0,
    last_purchase_price: payload.last_purchase_price ?? payload.unit_price ?? 0,
    avg_purchase_price: payload.avg_purchase_price ?? payload.unit_price ?? 0,
    last_sale_price: payload.last_sale_price ?? payload.unit_price ?? 0,
    avg_sale_price: payload.avg_sale_price ?? payload.unit_price ?? 0,
  }
  products.push(product)
  res.status(201).json(product)
})

app.get('/api/products/:id/movement', (req, res) => {
  const product = products.find(p => p.id === req.params.id)
  if (!product) return res.status(404).json({ detail: 'Not found' })
  const history = invoices.flatMap(inv =>
    (inv.items || [])
      .filter(item => item.description === product.name)
      .map(item => ({
        id: `${product.id}-${item.id}`,
        type: 'invoice',
        quantity: item.quantity,
        invoice_id: inv.id,
        timestamp: now().toISOString(),
        notes: 'فاکتور مرتبط',
      })),
  )
  res.json({ product, movement: history })
})

app.get('/api/persons', (req, res) => res.json(persons))

app.post('/api/persons', (req, res) => {
  const nextId = `person-${persons.length + 1}`
  const payload = req.body
  const person = {
    id: nextId,
    name: payload.name || 'طرف جدید',
    mobile: payload.mobile || '',
    kind: payload.kind || 'customer',
  }
  persons.push(person)
  activitiesByPerson[person.id] = activitiesByPerson[person.id] || []
  res.status(201).json(person)
})

app.get('/api/persons/balances', (req, res) => {
  const balances = persons.map(person => ({ person_id: person.id, balance: payments.filter(p => p.party_name === person.name).reduce((sum, p) => sum + (p.direction === 'in' ? p.amount : -p.amount), 0) }))
  res.json({ balances })
})

app.get('/api/persons/:id/activities', (req, res) => {
  res.json(activitiesByPerson[req.params.id] || [])
})

app.post('/api/persons/:id/activities', (req, res) => {
  const { content } = req.body
  const list = activitiesByPerson[req.params.id] || []
  const entry = { id: list.length + 1, person_id: req.params.id, content: content || 'فعالیت جدید', created_at: now().toISOString(), created_by: 1, next_action_at: null }
  list.unshift(entry)
  activitiesByPerson[req.params.id] = list
  res.status(201).json(entry)
})

app.delete('/api/persons/:id/activities/:activityId', (req, res) => {
  const list = activitiesByPerson[req.params.id] || []
  const index = list.findIndex(a => a.id === Number(req.params.activityId))
  if (index === -1) return res.status(404).json({ detail: 'Not found' })
  list.splice(index, 1)
  res.status(204).end()
})

app.get('/api/ledger/party/:id', (req, res) => {
  const person = persons.find(p => p.id === req.params.id)
  const entries = payments
    .filter(p => p.party_name === person?.name)
    .map(p => ({
      id: `ledger-${req.params.id}-${p.id}`,
      date: p.server_time,
      amount: p.direction === 'in' ? p.amount : -p.amount,
      note: p.note,
    }))
  res.json(entries)
})

app.get('/api/payments', (req, res) => {
  res.json(payments.sort((a, b) => b.id - a.id))
})

app.post('/api/payments/manual', (req, res) => {
  const payload = req.body
  const nextId = payments.length ? Math.max(...payments.map(p => p.id)) + 1 : 1
  const invoice = payload.invoice_id ? invoices.find(inv => inv.id === payload.invoice_id) : null
  const entry = {
    id: nextId,
    payment_number: `PAY-${pad2(nextId)}`,
    direction: payload.direction ?? 'in',
    method: payload.method ?? 'cash',
    party_name: payload.party_name ?? invoice?.party_name ?? 'طرف جدید',
    amount: payload.amount ?? 0,
    status: 'posted',
    server_time: now().toISOString(),
    due_date: payload.due_date || null,
    note: payload.note || '',
    invoice_id: invoice?.id ?? null,
  }
  payments.push(entry)
  createBlockchainEntry('payment', entry.id, 'create', entry)
  res.status(201).json(entry)
})

app.patch('/api/payments/:id', (req, res) => {
  const payment = payments.find(p => p.id === Number(req.params.id))
  if (!payment) return res.status(404).json({ detail: 'Not found' })
  Object.assign(payment, req.body, { server_time: payment.server_time || now().toISOString() })
  createBlockchainEntry('payment', payment.id, 'update', payment)
  res.json(payment)
})

app.get('/api/dashboard/summary', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const invoiceCounts = {
    today: invoices.filter(inv => inv.server_time?.startsWith(today)).length,
    '7days': invoices.filter(inv => { const diff = Date.now() - new Date(inv.server_time).getTime(); return diff <= 7 * 24 * 3600 * 1000 }).length,
    month: invoices.filter(inv => new Date(inv.server_time).getMonth() === new Date().getMonth()).length,
  }
  const receipts_today = payments.filter(p => p.direction === 'in' && p.server_time.startsWith(today)).reduce((sum, p) => sum + p.amount, 0)
  const payments_today = payments.filter(p => p.direction === 'out' && p.server_time.startsWith(today)).reduce((sum, p) => sum + p.amount, 0)
  const net_today = receipts_today - payments_today
  const cash_balances = paymentMethods.reduce((acc, method) => {
    acc[method.key] = payments.filter(p => p.method === method.key).reduce((sum, p) => sum + (p.direction === 'in' ? p.amount : -p.amount), 0)
    return acc
  }, {})
  res.json({ invoices: invoiceCounts, receipts_today, payments_today, net_today, cash_balances })
})

app.get('/api/dashboard/checks-due', (req, res) => {
  const days = Number(req.query.within_days) || 21
  const nowTime = Date.now()
  const due = payments.filter(p => p.due_date).filter(p => {
    const dueDate = new Date(p.due_date).getTime()
    return dueDate >= nowTime && dueDate <= nowTime + days * 24 * 3600 * 1000
  })
  res.json(due)
})

app.get('/api/dashboard/old-stock', (req, res) => {
  const limit = Number(req.query.limit) || 10
  const data = products.map(p => ({ product_id: p.id, name: p.name, inventory: p.inventory, last_price_at: now().toISOString() }))
  res.json(data.slice(0, limit))
})

app.get('/api/dashboard/prices', (req, res) => {
  res.json({ fx: { USD: 42000, EUR: 45000 }, crypto: { BTC: { usd: 52000 }, ETH: { usd: 3400 } } })
})

app.get('/api/dashboard/sales-trends', (req, res) => {
  const days = Number(req.query.days) || 30
  const series = []
  for (let i = days - 1; i >= 0; i -= 3) {
    const date = new Date(Date.now() - i * 24 * 3600 * 1000)
    series.push({ date: date.toISOString().slice(0, 10), total: Math.round(400000 + Math.random() * 600000) })
  }
  res.json({ series })
})

app.get('/api/dashboard/widgets', (req, res) => res.json(dashboardWidgets))

app.post('/api/dashboard/widgets', (req, res) => {
  const payload = req.body
  const nextId = ++widgetCounter
  const widget = {
    id: nextId,
    widget_type: payload.type || 'custom',
    title: payload.title || 'ویجت جدید',
    position_x: dashboardWidgets.length,
    position_y: 0,
    width: 2,
    height: 1,
    enabled: true,
    order: dashboardWidgets.length + 1,
  }
  dashboardWidgets.push(widget)
  res.status(201).json(widget)
})

app.patch('/api/dashboard/widgets/:id', (req, res) => {
  const widget = dashboardWidgets.find(w => w.id === Number(req.params.id))
  if (!widget) return res.status(404).json({ detail: 'Not found' })
  Object.assign(widget, req.body)
  res.json(widget)
})

app.delete('/api/dashboard/widgets/:id', (req, res) => {
  dashboardWidgets = dashboardWidgets.filter(w => w.id !== Number(req.params.id))
  res.status(204).end()
})

app.post('/api/dashboard/widgets/reorder', (req, res) => {
  const { widgets } = req.body
  if (Array.isArray(widgets)) {
    dashboardWidgets = dashboardWidgets.map(widget => ({ ...widget, order: widgets.indexOf(widget.id) }))
  }
  res.json({ success: true })
})

app.get('/api/financial/auto-context', (req, res) => {
  const current = now()
  const jalali = formatJalali(current)
  res.json({
    context: {
      current_financial_year: {
        id: 1,
        name: 'سال مالی جاری',
        start_date: new Date(current.getFullYear(), 0, 1).toISOString().slice(0, 10),
        end_date: new Date(current.getFullYear(), 11, 31).toISOString().slice(0, 10),
        start_date_jalali: formatJalali(new Date(current.getFullYear(), 0, 1)),
        end_date_jalali: formatJalali(new Date(current.getFullYear(), 11, 31)),
        is_closed: false,
      },
      current_jalali: {
        year: Number(jalali.split('/')[0]),
        month: Number(jalali.split('/')[1]),
        day: Number(jalali.split('/')[2]),
        formatted: jalali,
      },
      auto_created: true,
    },
    date_suggestions: {
      today: jalali,
      month_start: jalali,
      quarter_start: jalali,
      year_start: jalali,
      year_end: jalali,
    },
  })
})

app.get('/api/roadmap', (req, res) => {
  const roadmap = readRoadmap()
  if (!roadmap) {
    return res.status(503).json({ detail: 'Roadmap data unavailable' })
  }
  res.json(roadmap)
})

app.get('/api/blockchain/entries', (req, res) => {
  const { entity_type: entityType, entity_id: entityId, limit } = req.query
  let entries = blockchainEntries
  if (entityType) entries = entries.filter(entry => entry.entity_type === entityType)
  if (entityId) entries = entries.filter(entry => entry.entity_id === String(entityId))
  const lim = Number(limit) || entries.length
  const sliced = entries.slice(Math.max(0, entries.length - lim))
  res.json({ entries: sliced, count: sliced.length })
})

app.post('/api/blockchain/verify', (req, res) => {
  const entityType = req.query.entity_type || req.body?.entity_type
  const entityId = req.query.entity_id || req.body?.entity_id
  if (!entityType || !entityId) {
    const chain = verifyBlockchain()
    return res.json({ is_valid: chain.ok, message: chain.detail || 'OK', entries_checked: chain.total })
  }
  const entries = blockchainEntries.filter(
    entry => entry.entity_type === entityType && entry.entity_id === String(entityId),
  )
  if (entries.length === 0) {
    return res.status(404).json({ detail: 'Entity chain not found' })
  }
  const result = verifyEntityChainEntries(entries)
  res.json({ is_valid: result.ok, message: result.message, entries_checked: entries.length })
})

app.get('/api/blockchain/proof', (req, res) => {
  const { entity_type: entityType, entity_id: entityId, entry_id: entryId } = req.query
  if (!entityType || !entityId || !entryId) {
    return res.status(400).json({ detail: 'entity_type, entity_id و entry_id الزامی است' })
  }
  const entries = blockchainEntries.filter(
    entry => entry.entity_type === entityType && entry.entity_id === String(entityId),
  )
  if (!entries.length) {
    return res.status(404).json({ detail: 'Entity chain not found' })
  }
  const target = entries.find(entry => entry.id === Number(entryId))
  if (!target) {
    return res.status(404).json({ detail: 'Entry not found' })
  }
  const position = entries.findIndex(entry => entry.id === Number(entryId))
  const chainStatus = verifyEntityChainEntries(entries)
  res.json({
    entity_type: entityType,
    entity_id: entityId,
    entry_id: Number(entryId),
    data_hash: target.current_hash,
    previous_hash: target.previous_hash,
    timestamp: target.timestamp,
    action: target.action,
    chain_is_valid: chainStatus.ok,
    chain_message: chainStatus.message,
    total_entries_in_chain: entries.length,
    entry_position: position + 1,
  })
})

app.get('/api/admin/settings', (req, res) => res.json(systemSettings))

app.patch('/api/admin/settings/:key', (req, res) => {
  const setting = systemSettings.find(s => s.key === req.params.key)
  if (!setting) return res.status(404).json({ detail: 'Not found' })
  setting.value = req.body.value
  setting.updated_at = now().toISOString()
  res.json(setting)
})

app.delete('/api/admin/settings/:key', (req, res) => {
  const index = systemSettings.findIndex(s => s.key === req.params.key)
  if (index === -1) return res.status(404).json({ detail: 'Not found' })
  systemSettings.splice(index, 1)
  res.status(204).end()
})

app.get('/api/backups', (req, res) => res.json(backups))

app.post('/api/backups/manual', (req, res) => {
  const payload = req.body
  const entry = {
    id: ++backupCounter,
    filename: payload.filename || `hp-backup-${backupCounter}.zip`,
    kind: payload.kind || 'manual',
    created_at: now().toISOString(),
    size_bytes: payload.size_bytes ?? 0,
    note: payload.note || 'بکاپ دستی',
  }
  backups.push(entry)
  res.status(201).json(entry)
})

app.get('/api/integrations', (req, res) => res.json(integrations))

app.get('/api/admin/activity', (req, res) => {
  const logs = []
  for (let i = 1; i <= 20; i += 1) {
    logs.push({ id: i, path: '/api/example', method: 'GET', detail: 'رزرو موفق', status_code: 200, created_at: now().toISOString(), username: 'mehdi_pakzamir' })
  }
  res.json(logs)
})

app.get('/api/users', (req, res) => res.json(users))

app.post('/api/users', (req, res) => {
  const payload = req.body
  const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1
  const user = {
    id: nextId,
    username: payload.username || `user-${nextId}`,
    email: payload.email || null,
    full_name: payload.full_name || payload.username || `کاربر ${nextId}`,
    role_id: payload.role_id ?? 2,
    is_active: true,
  }
  users.push(user)
  res.status(201).json(user)
})

app.delete('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === Number(req.params.id))
  if (index === -1) return res.status(404).json({ detail: 'Not found' })
  users.splice(index, 1)
  res.status(204).end()
})

app.get('/api/roles', (req, res) => res.json(roles))

app.post('/api/roles', (req, res) => {
  const payload = req.body
  const nextId = roles.length ? Math.max(...roles.map(r => r.id)) + 1 : 1
  const role = { id: nextId, name: payload.name || `Role ${nextId}`, description: payload.description || '' }
  roles.push(role)
  res.status(201).json(role)
})

app.post('/api/roles/:id/permissions', (req, res) => {
  res.json({ success: true })
})

app.get('/api/permissions', (req, res) => res.json(permissionsList))

app.get('/api/customer-groups', (req, res) => res.json(customerGroups))

app.post('/api/customer-groups', (req, res) => {
  const nextId = customerGroups.length ? Math.max(...customerGroups.map(c => c.id)) + 1 : 1
  const payload = req.body
  const group = { id: nextId, name: payload.name || `گروه ${nextId}`, description: payload.description || '', members: [] }
  customerGroups.push(group)
  res.status(201).json(group)
})

app.patch('/api/customer-groups/:id', (req, res) => {
  const group = customerGroups.find(g => g.id === Number(req.params.id))
  if (!group) return res.status(404).json({ detail: 'Not found' })
  Object.assign(group, req.body)
  res.json(group)
})

app.delete('/api/customer-groups/:id', (req, res) => {
  const index = customerGroups.findIndex(g => g.id === Number(req.params.id))
  if (index === -1) return res.status(404).json({ detail: 'Not found' })
  customerGroups.splice(index, 1)
  res.status(204).end()
})

app.post('/api/customer-groups/:groupId/members/:memberId', (req, res) => {
  const group = customerGroups.find(g => g.id === Number(req.params.groupId))
  if (!group) return res.status(404).json({ detail: 'Group not found' })
  if (!group.members.includes(req.params.memberId)) group.members.push(req.params.memberId)
  res.json(group)
})

app.delete('/api/customer-groups/:groupId/members/:memberId', (req, res) => {
  const group = customerGroups.find(g => g.id === Number(req.params.groupId))
  if (!group) return res.status(404).json({ detail: 'Group not found' })
  group.members = group.members.filter(member => member !== req.params.memberId)
  res.status(204).end()
})

app.post('/api/search', (req, res) => {
  const q = (req.body.query || '').toLowerCase()
  const personHits = persons.filter(p => p.name.toLowerCase().includes(q)).map(p => ({ type: 'person', label: p.name, id: p.id }))
  const invoiceHits = invoices.filter(inv => (inv.invoice_number || '').toLowerCase().includes(q)).map(inv => ({ type: 'invoice', label: inv.invoice_number, id: inv.id }))
  const productHits = products.filter(prod => prod.name.toLowerCase().includes(q)).map(prod => ({ type: 'product', label: prod.name, id: prod.id }))
  res.json({ results: [...personHits, ...invoiceHits, ...productHits] })
})

app.post('/api/sms/send', (req, res) => res.json({ success: true }))
app.post('/api/sms/register-user', (req, res) => res.json({ registered: true }))

app.post('/api/invoices/manual', (req, res) => {
  const nextId = invoices.length ? Math.max(...invoices.map(inv => inv.id)) + 1 : 1
  const payload = req.body
  const items = (payload.items || []).map((item, idx) => ({ id: idx + 1, description: item.description, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, total: item.quantity * item.unit_price }))
  const subtotal = items.reduce((sum, i) => sum + i.total, 0)
  const invoice = {
    id: nextId,
    invoice_number: `INV-2024-${pad2(nextId)}`,
    invoice_type: payload.invoice_type || 'sale',
    party_name: payload.party_name || 'طرف جدید',
    subtotal,
    total: subtotal,
    status: 'draft',
    server_time: now().toISOString(),
    client_time: now().toISOString(),
    mode: 'manual',
    note: payload.note || '',
    items,
  }
  invoices.unshift(invoice)
  createBlockchainEntry('invoice', invoice.id, 'create', invoice)
  res.status(201).json(invoice)
})

app.get('/api/invoices', (req, res) => {
  const limit = Number(req.query.limit) || invoices.length
  res.json(invoices.slice(0, limit))
})

app.get('/api/invoices/open-for-payment', (req, res) => res.json(invoices.filter(inv => inv.status === 'final')))

app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices.find(inv => inv.id === Number(req.params.id))
  if (!invoice) return res.status(404).json({ detail: 'Not found' })
  res.json(invoice)
})

app.post('/api/invoices/:id/finalize', (req, res) => {
  const invoice = invoices.find(inv => inv.id === Number(req.params.id))
  if (!invoice) return res.status(404).json({ detail: 'Not found' })
  invoice.status = 'final'
  createBlockchainEntry('invoice', invoice.id, 'finalize', invoice)
  res.json(invoice)
})

app.get('/api/invoices/:id/payments', (req, res) => {
  const invoiceId = Number(req.params.id)
  res.json(payments.filter(p => p.invoice_id === invoiceId))
})

app.post('/api/exports/invoice/:id', (req, res) => res.json({ success: true }))
app.get('/api/prints/invoice/:id', (req, res) => res.json({ status: 'ready', id: Number(req.params.id) }))

app.get('/api/reports/pnl', (req, res) => {
  res.json({ sales: 900000, purchases: 450000, gross_profit: 450000, start: req.query.start || null, end: req.query.end || null })
})

app.get('/api/reports/cash', (req, res) => {
  const method = req.query.method
  const balance = payments.filter(p => !method || p.method === method).reduce((sum, p) => sum + (p.direction === 'in' ? p.amount : -p.amount), 0)
  res.json({ method: method || 'all', balance })
})

app.get('/api/reports/stock', (req, res) => {
  res.json(products.map(p => ({ product_id: p.id, name: p.name, inventory: p.inventory, unit_price: p.unit_price, total_value: p.inventory * p.unit_price })))
})

app.get('/api/icc/categories', (req, res) => res.json([{ id: 1, title: 'دفاتر تهران' }, { id: 2, title: 'شعبه‌های شهرستان' }]))
app.post('/api/icc/categories', (req, res) => res.status(201).json({ id: 3, ...req.body }))
app.get('/api/icc/centers', (req, res) => res.json([{ id: 1, name: 'مرکز تهران', category_id: 1 }]))
app.post('/api/icc/centers', (req, res) => res.status(201).json({ id: 2, ...req.body }))
app.get('/api/icc/units', (req, res) => res.json([{ id: 1, name: 'واحد فروش', center_id: 1 }]))
app.post('/api/icc/units', (req, res) => res.status(201).json({ id: 2, ...req.body }))
app.get('/api/icc/extensions', (req, res) => res.json([{ id: 1, name: 'افزونه CRM', unit_id: 1 }]))
app.post('/api/icc/extensions', (req, res) => res.status(201).json({ id: 2, ...req.body }))

app.use((req, res) => {
  res.status(404).json({ detail: 'Not implemented' })
})

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`)
})
