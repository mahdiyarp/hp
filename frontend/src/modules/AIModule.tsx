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
    setLoading((prev) => ({ ...prev, product: true }))

    try {
      const res = await apiPost('/api/external/ai/product-match', {
        name: productName || 'کاغذ تحریر ۸۰ گرمی A4 بسته ۵۰۰ عددی',
        category: productCat || 'ملزومات اداری',
        specs: productSpecs || 'گرماژ ۸۰، برند Snowa، کد انبار 4412، رنگ سفید، مناسب پرینتر لیزری',
      })

      setProductResult(res)
    } catch (err: any) {
      setProductResult({
        error: err?.message || 'تحلیل هوش مصنوعی برای تطبیق کالا انجام نشد. لطفاً دوباره تلاش کنید.',
      })
    } finally {
      setLoading((prev) => ({ ...prev, product: false }))
    }
  }

  const handleInvoiceAnalysis = async () => {
    setLoading((prev) => ({ ...prev, invoice: true }))

    try {
      const res = await apiPost('/api/external/ai/invoice-analysis', {
        content:
          invoiceText ||
          'فاکتور فروش شماره ۲۴۵ مربوط به شرکت بهار، شامل سه قلم کالا، تخفیف ۵٪ و مالیات ۹٪ ارزش افزوده',
      })

      setInvoiceResult(res)
    } catch (err: any) {
      setInvoiceResult({
        error: err?.message || 'تحلیل متن فاکتور انجام نشد. لطفاً بعداً دوباره تلاش کنید.',
      })
    } finally {
      setLoading((prev) => ({ ...prev, invoice: false }))
    }
  }

  return (
    <div className="space-y-6">
      <section className={`${retroPanelPadded} space-y-3`}>
        <p className={retroHeading}>
          تطبیق هوشمند کالا با کمک مدل‌های OpenAI برای پیدا کردن نزدیک‌ترین نمونه موجود در انبار
        </p>

        <div className="grid md:grid-cols-3 gap-3">
          <input
            className={inputClass}
            placeholder="نام کالا یا خدمات (مثلاً «کاغذ تحریر ۸۰ گرمی»)"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="دسته‌بندی (ملزومات اداری، خدمات پس از فروش، دارایی ثابت و ...)"
            value={productCat}
            onChange={(e) => setProductCat(e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="مشخصات فنی یا کیفی (وزن، برند، کد انبار، رنگ و ...)"
            value={productSpecs}
            onChange={(e) => setProductSpecs(e.target.value)}
          />
        </div>

        <button className={retroButton} onClick={handleProductMatch} disabled={loading.product}>
          {loading.product ? 'در حال تحلیل کالا...' : 'دریافت تطبیق هوشمند'}
        </button>

        {productResult && (
          <div className={`${retroPanel} p-3 text-xs`}>
            {productResult.error ? (
              <p className="text-red-500">{productResult.error}</p>
            ) : (
              <>
                <p>نام پیشنهادی: {productResult.matched_name || '-'}</p>
                <p>کد کالا: {productResult.code || '-'}</p>
                <p>شرایط گارانتی/پشتیبانی: {productResult.warranty_info || '-'}</p>
                <p>درصد اطمینان مدل: {productResult.confidence ?? '-'}</p>
                <p>پیشنهاد تکمیلی: {productResult.suggestion || '-'}</p>
              </>
            )}
          </div>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-3`}>
        <p className={retroHeading}>
          تحلیل متنی فاکتور و استخراج اطلاعات ساختاری با کمک OpenAI
        </p>

        <textarea
          className={`${inputClass} w-full min-h-[140px]`}
          placeholder="متن کامل فاکتور، رسید یا صورت‌حساب (مبالغ، تأمین‌کننده، اقلام و توضیحات)"
          value={invoiceText}
          onChange={(e) => setInvoiceText(e.target.value)}
        />

        <button className={retroButton} onClick={handleInvoiceAnalysis} disabled={loading.invoice}>
          {loading.invoice ? 'در حال تحلیل فاکتور...' : 'تحلیل فاکتور'}
        </button>

        {invoiceResult && (
          <div className={`${retroPanel} p-3 text-xs`}>
            {invoiceResult.error ? (
              <p className="text-red-500">{invoiceResult.error}</p>
            ) : (
              <>
                <p>تأمین‌کننده: {invoiceResult.supplier || '-'}</p>
                <p>شماره فاکتور / رسید: {invoiceResult.invoice_number || '-'}</p>
                <p>جمع کل (با مالیات): {invoiceResult.total ?? '-'}</p>

                {Array.isArray(invoiceResult.items) && (
                  <ul className="list-disc list-inside text-[11px] space-y-1">
                    {invoiceResult.items.map((item: any, idx: number) => (
                      <li key={idx}>
                        {item.description} - {item.quantity} x {item.unit_price} = {item.total}
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
