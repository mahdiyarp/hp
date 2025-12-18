import { apiGet, apiPost, apiPatch } from './api'

// TypeScript interfaces for Sale Orders based on backend models
export interface SaleOrderItem {
  id?: number
  description: string
  quantity: number
  unit?: string | null
  unit_price: number
  discount?: number | null
  tax_rate?: number | null
  total?: number | null
  product_id?: string | null
}

export interface SaleOrder {
  id: number
  order_number: string | null
  status: string
  party_id?: string | null
  party_name: string | null
  client_time: string | null
  server_time: string
  subtotal: number | null
  discount?: number | null
  tax?: number | null
  shipping?: number | null
  total: number | null
  currency: string
  note?: string | null
  tracking_code?: string | null
  invoice_id?: number | null
  items?: SaleOrderItem[]
}

export interface CreateSaleOrderPayload {
  party_name: string
  client_time?: string
  note?: string
  items: Array<{
    description: string
    quantity: number
    unit?: string | null
    unit_price: number
    product_id?: string | null
    discount?: number | null
    tax_rate?: number | null
  }>
  client_calendar?: 'jalali' | 'gregorian'
}

export async function listSaleOrders(limit = 200): Promise<SaleOrder[]> {
  return apiGet<SaleOrder[]>(`/api/sales/orders?limit=${limit}`)
}

export async function getSaleOrder(id: number): Promise<SaleOrder> {
  return apiGet<SaleOrder>(`/api/sales/orders/${id}`)
}

export async function createSaleOrder(payload: CreateSaleOrderPayload): Promise<SaleOrder> {
  return apiPost<SaleOrder>('/api/sales/orders', payload)
}

export async function updateSaleOrder(
  id: number,
  data: Partial<CreateSaleOrderPayload>,
): Promise<SaleOrder> {
  return apiPatch<SaleOrder>(`/api/sales/orders/${id}`, data)
}

export async function finalizeSaleOrder(id: number, client_time?: string): Promise<SaleOrder> {
  return apiPost<SaleOrder>(`/api/sales/orders/${id}/finalize`, client_time ? { client_time } : {})
}

// Export a sale order. Currently only CSV supported on backend.
export async function exportSaleOrder(
  id: number,
  format: 'csv' | 'pdf' | 'xlsx' = 'csv',
): Promise<{ download_url?: string }> {
  return apiPost<{ download_url?: string }>(`/api/exports/sale-order/${id}?format=${format}`, {})
}
