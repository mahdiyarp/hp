import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import { exportToCsv } from '../utils/export'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroPanelPadded,
  retroMuted,
} from '../components/retroTheme'
import PnLReport from '../components/reports/PnLReport'
import CashReport from '../components/reports/CashReport'
import StockValuationReport from '../components/reports/StockValuationReport'

// ... (interfaces remain the same)

// Local data interfaces (avoid name collision with component identifiers)
interface PnLReportData {
  sales: number
  purchases: number
  gross_profit: number
}

interface CashReportData {
  balance: number
}

export default function ReportsModule({ smartDate }: ModuleComponentProps) {
  const [rangeDays, setRangeDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [pnl, setPnl] = useState<PnLReportData | null>(null)
  const [cashAll, setCashAll] = useState<CashReportData | null>(null)
  const [cashMethods, setCashMethods] = useState<Record<string, number>>({})
  const [stock, setStock] = useState<StockValuation[]>([])
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  const [personReport, setPersonReport] = useState<PersonReportEntry | null>(null)
  const [personLoading, setPersonLoading] = useState(false)
  const [nlQuery, setNlQuery] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryMatches, setQueryMatches] = useState<InvoiceMatch[]>([])
  const [queryError, setQueryError] = useState<string | null>(null)

  useEffect(() => {
    loadReports(rangeDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, smartDate.isoDate])

  useEffect(() => {
    void loadPersons()
  }, [])

  async function loadReports(days: number) {
    // ... (loadReports function remains the same)
  }

  const exportPnl = () => {
    // ... (exportPnl function remains the same)
  }

  const exportCash = () => {
    // ... (exportCash function remains the same)
  }

  const exportStock = () => {
    // ... (exportStock function remains the same)
  }

  async function loadPersons() {
    // ... (loadPersons function remains the same)
  }

  async function loadPersonReport(partyId: string) {
    // ... (loadPersonReport function remains the same)
  }

  async function runNaturalQuery() {
    // ... (runNaturalQuery function remains the same)
  }

  if (loading) {
    // ... (loading indicator remains the same)
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className={`${retroPanelPadded} space-y-2`}>
          <p className={`${retroHeading} text-[var(--retro-muted-text)]`}>هشدارهای گزارش</p>
          <ul className="list-disc list-inside text-xs text-[var(--retro-muted-text)] space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <PnLReport pnl={pnl} onExport={exportPnl} />
      <CashReport cashAll={cashAll} cashMethods={cashMethods} onExport={exportCash} />
      <StockValuationReport stock={stock} onExport={exportStock} />

      {/* ... (the rest of the component remains the same) */}
    </div>
  )
}

