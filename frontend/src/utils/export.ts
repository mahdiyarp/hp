import { apiPost } from '../services/api'

export type InvoiceExportFormat = 'pdf' | 'csv' | 'xlsx'

export async function requestInvoiceExport(
  invoiceId: number,
  format: InvoiceExportFormat = 'pdf',
): Promise<string | null> {
  const response = await apiPost<{ download_url?: string | null }>(
    `/api/exports/invoice/${invoiceId}?format=${format}`,
    {},
  )

  if (response && typeof response.download_url === 'string' && response.download_url.length > 0) {
    return response.download_url
  }

  return null
}
