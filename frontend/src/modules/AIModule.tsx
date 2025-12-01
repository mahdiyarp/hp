import React, { useState } from 'react'
import { apiPost } from '../services/api'
import { retroPanel, retroPanelPadded, retroHeading, retroButton } from '../components/retroTheme'

const inputClass =
  'bg-[#f6f1df] border border-[#bfb69f] text-[#2e2720] placeholder:text-[#6b5840] px-3 py-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#154b5f] focus:border-[#154b5f] transition font-[Yekan]'

export default function AIModule() {
  const [productName, setProductName] = useState('')
  const [productCat, setProductCat] = useState('')
  const [productSpecs, setProductSpecs] = useState('')
  const [productResult, setProductResult] = useState<any>(null)
  const [invoiceText, setInvoiceText] = useState('')
  const [invoiceResult, setInvoiceResult] = useState<any>(null)
  const [loading, setLoading] = useState({ product: false, invoice: false })

  const handleProductMatch = async () => {
    setLoading(prev => ({ ...prev, product: true }))
    try {
      const res = await apiPost('/api/external/ai/product-match', {
        name: productName || 'ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§',
        category: productCat || 'ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢',
        specs: productSpecs || 'ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¯',
      })
      setProductResult(res)
    } catch (err: any) {
      setProductResult({ error: err?.message || 'ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ AI' })
    } finally {
      setLoading(prev => ({ ...prev, product: false }))
    }
  }

  const handleInvoiceAnalysis = async () => {
    setLoading(prev => ({ ...prev, invoice: true }))
    try {
      const res = await apiPost('/api/external/ai/invoice-analysis', {
        content: invoiceText || 'ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±',
      })
      setInvoiceResult(res)
    } catch (err: any) {
      setInvoiceResult({ error: err?.message || 'ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ AI' })
    } finally {
      setLoading(prev => ({ ...prev, invoice: false }))
    }
  }

  return (
    <div className="space-y-6">
      <section className={`${retroPanelPadded} space-y-3`}>
        <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† (OpenAI)</p>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className={inputClass}
            placeholder="ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§"
            value={productName}
            onChange={e => setProductName(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢"
            value={productCat}
            onChange={e => setProductCat(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾"
            value={productSpecs}
            onChange={e => setProductSpecs(e.target.value)}
          />
        </div>
        <button className={retroButton} onClick={handleProductMatch} disabled={loading.product}>
          {loading.product ? 'ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ²ط·آ·ط¢آ·ط·آ¢ط¢آ´...' : 'ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§'}
        </button>
        {productResult && (
          <div className={`${retroPanel} p-3 text-xs`}>
            {productResult.error ? (
              <p className="text-red-500">{productResult.error}</p>
            ) : (
              <>
                <p>ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§: {productResult.matched_name || '-'}</p>
                <p>ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ¯: {productResult.code || '-'}</p>
                <p>ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢: {productResult.warranty_info || '-'}</p>
                <p>ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯: {productResult.confidence ?? '-'}</p>
                <p>ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯: {productResult.suggestion || '-'}</p>
              </>
            )}
          </div>
        )}
      </section>
      <section className={`${retroPanelPadded} space-y-3`}>
        <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ± (OpenAI)</p>
        <textarea
          className={`${inputClass} w-full min-h-[140px]`}
          placeholder="ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¯"
          value={invoiceText}
          onChange={e => setInvoiceText(e.target.value)}
        />
        <button className={retroButton} onClick={handleInvoiceAnalysis} disabled={loading.invoice}>
          {loading.invoice ? 'ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†...' : 'ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±'}
        </button>
        {invoiceResult && (
          <div className={`${retroPanel} p-3 text-xs`}>
            {invoiceResult.error ? (
              <p className="text-red-500">{invoiceResult.error}</p>
            ) : (
              <>
                <p>ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’: {invoiceResult.supplier || '-'}</p>
                <p>ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±: {invoiceResult.invoice_number || '-'}</p>
                <p>ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¹: {invoiceResult.total ?? '-'}</p>
                {Array.isArray(invoiceResult.items) && (
                  <ul className="list-disc list-inside text-[11px] space-y-1">
                    {invoiceResult.items.map((item: any, idx: number) => (
                      <li key={idx}>
                        {item.description} ط·آ·ط¢آ£ط£آ¢أ¢â€ڑآ¬أ¢â‚¬â€Œ {item.quantity} ط·آ·ط¢آ£ط£آ¢أ¢â€ڑآ¬أ¢â‚¬â€Œ {item.unit_price} = {item.total}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
