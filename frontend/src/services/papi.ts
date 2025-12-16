import { fetchWithAuth } from './auth.ts'

export async function papiGet(path: string, params?: Record<string, any>) {
  const q = new URLSearchParams()
  Object.entries(params || {}).forEach(([k,v]) => { if (v !== undefined && v !== null) q.append(k, String(v)) })
  const res = await fetchWithAuth(`/api/papi/proxy${path}?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function papiPost(path: string, body?: any) {
  const res = await fetchWithAuth(`/api/papi/proxy${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const PApi = {
  // Examples based on s.api.ir
  // route via backend helper to normalize request to api.ir
  sendSms: (payload: { mobiles: string[]; messageText?: string; message?: string; lineNumber?: string }) => fetchWithAuth('/api/apiir/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),
  // api.ir OTP helpers (direct backend routes)
  smsOtp: (code: string, mobile: string, template?: number) => {
    const normalizedCode = String(code).trim()
    const normalizedMobile = String(mobile).trim()
    if (!/^\d{4,6}$/.test(normalizedCode)) {
      return Promise.reject(new Error('کد نامعتبر است (۴ تا ۶ رقم)'))
    }
    if (!/^0\d{10}$/.test(normalizedMobile)) {
      return Promise.reject(new Error('شماره موبایل نامعتبر است'))
    }
    return fetchWithAuth('/api/apiir/otp/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalizedCode, mobile: normalizedMobile, template }),
    }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
  },
  callOtp: (code: string, number: string) => fetchWithAuth('/api/apiir/otp/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, number }),
  }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),
  startOtp: (mobile: string, code?: string) => fetchWithAuth('/api/papi/otp/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, code })
  }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),
  verifyOtp: (mobile: string, code: string) => {
    const normalizedCode = String(code).trim()
    const normalizedMobile = String(mobile).trim()
    if (!/^\d{4,6}$/.test(normalizedCode)) {
      return Promise.reject(new Error('کد نامعتبر است (۴ تا ۶ رقم)'))
    }
    if (!/^0\d{10}$/.test(normalizedMobile)) {
      return Promise.reject(new Error('شماره موبایل نامعتبر است'))
    }
    return fetchWithAuth('/api/papi/otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: normalizedMobile, code: normalizedCode })
    }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
  },
  getLines: () => fetchWithAuth('/api/sms/lines').then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),
  addBlacklist: (mobile: string) => papiPost('/blacklist/add', { mobile }),
  removeBlacklist: (mobile: string) => papiPost('/blacklist/remove', { mobile }),
  reportDaily: (dateIso: string) => fetchWithAuth(`/api/sms/metrics/daily?days=14`).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),
  // Dev-only provider switch (backend local route)
  setProvider: async (provider: 'mock'|'sms.ir'|'papi.ir') => {
    const res = await fetchWithAuth(`/api/dev/papi/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  setApiKey: async (apiKey: string) => {
    const res = await fetchWithAuth(`/api/dev/papi/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  // Templates (CRUD) via proxy
  listTemplates: () => papiGet('/templates'),
  createTemplate: (name: string, content: string) => papiPost('/templates', { name, content }),
  deleteTemplate: (id: string) => papiPost('/templates/delete', { id }),
  // Webhooks config via proxy
  getWebhooks: () => papiGet('/webhooks'),
  setWebhook: (event: string, url: string) => papiPost('/webhooks/set', { event, url }),
}

// Named exports for direct imports
export const startOtp = PApi.startOtp
export const verifyOtp = PApi.verifyOtp
export const smsOtp = PApi.smsOtp
export const callOtp = PApi.callOtp
export const setProvider = PApi.setProvider
export const setApiKey = PApi.setApiKey
export const listTemplates = PApi.listTemplates
export const createTemplate = PApi.createTemplate
export const deleteTemplate = PApi.deleteTemplate
export const getWebhooks = PApi.getWebhooks
export const setWebhook = PApi.setWebhook
