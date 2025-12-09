import { fetchWithAuth } from './auth'

export async function getOrgFeatures(): Promise<{ features: string[] }> {
  try {
    const res = await fetchWithAuth('/api/org/features', { method: 'GET' })
    const data = await res.json()
    return { features: Array.isArray(data.features) ? data.features : [] }
  } catch {
    return { features: [] }
  }
}
