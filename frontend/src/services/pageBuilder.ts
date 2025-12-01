import { apiDelete, apiGet, apiPost } from './api'

export interface PageBuilderTemplate {
  id: number
  name: string
  html: string
  css: string
  metadata?: Record<string, unknown>
  updated_at: string
}

export interface PageBuilderTemplatePayload {
  id?: number
  name: string
  html: string
  css?: string
  metadata?: Record<string, unknown>
}

export function listPageBuilderTemplates() {
  return apiGet<PageBuilderTemplate[]>('/api/page-builder/templates')
}

export function savePageBuilderTemplate(payload: PageBuilderTemplatePayload) {
  return apiPost<PageBuilderTemplate>('/api/page-builder/templates', payload)
}

export function deletePageBuilderTemplate(id: number) {
  return apiDelete<{ ok: boolean }>(`/api/page-builder/templates/${id}`)
}
