import React, { useEffect, useState } from 'react'

export default function SmartAssistantWidget() {
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [followup, setFollowup] = useState('')

  const ask = async () => {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question || 'سلام', mode: 'general' }),
    })
    if (res.ok) {
      const data = await res.json()
      setReply(data.reply)
    }
  }

  const sendFollowup = async () => {
    if (!followup) return
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: followup, mode: 'data_explain', context: analysis }),
    })
    if (res.ok) {
      const data = await res.json()
      setReply(data.reply)
    }
  }

  const handleFile = async file => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    const res = await fetch('/api/assistant/document/analyze', { method: 'POST', body: form })
    setUploading(false)
    if (res.ok) {
      setAnalysis(await res.json())
      setShowModal(false)
    }
  }

  const onFile = e => handleFile(e.target.files?.[0])

  const onDrop = e => {
    e.preventDefault()
    setDropActive(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  return (
    <div dir="rtl" style={{ background: '#f7f2e7', border: '1px solid #e0d4b8', padding: 16, borderRadius: 12 }}>
      <h3 style={{ marginBottom: 8 }}>دستیار حسابداری هوشمند</h3>
      <input
        style={{ width: '100%', padding: 8, borderRadius: 10, border: '1px solid #d8ccb7' }}
        placeholder="سوال خود را بپرسید…"
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />
      <button onClick={ask} style={{ marginTop: 8, padding: '8px 12px' }}>
        ارسال
      </button>
      {reply && <div style={{ marginTop: 8, background: '#fff', padding: 10, borderRadius: 8 }}>پاسخ: {reply}</div>}
      <div style={{ marginTop: 12 }}>
        <button style={{ padding: '8px 12px' }} onClick={() => setShowModal(true)}>
          آپلود سند
        </button>
        {uploading && <div style={{ marginTop: 6 }}>در حال آپلود...</div>}
        {analysis && (
          <div style={{ marginTop: 10, background: '#fff', padding: 10, borderRadius: 8 }}>
            <div>تحلیل سند</div>
            <div>نوع سند: {analysis.doc_type}</div>
            <div>عنوان: {analysis.title}</div>
            <div>شخص مقابل: {analysis.party?.name || '-'}</div>
            <div>مجموع: {analysis.totals?.grand_total ?? analysis.totals?.subtotal ?? '-'}</div>
            <div>اعتماد سیستم: {analysis.confidence_scores?.overall ?? '-'}</div>
            {analysis.suggested_journal?.length > 0 && (
              <div>
                <div style={{ marginTop: 6 }}>پیشنهاد ثبت حسابداری:</div>
                <table style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>کد حساب</th>
                      <th>بدهکار</th>
                      <th>بستانکار</th>
                      <th>دلیل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.suggested_journal.map((j, idx) => (
                      <tr key={idx}>
                        <td>{j.account_code}</td>
                        <td>{j.debit}</td>
                        <td>{j.credit}</td>
                        <td>{j.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button style={{ marginTop: 6 }}>ایجاد سند جدید بر اساس این تحلیل</button>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <label>سوال دنباله‌دار:</label>
              <input
                style={{ width: '100%', padding: 6, border: '1px solid #d8ccb7', borderRadius: 8 }}
                placeholder="این سند رو برام توضیح بده"
                value={followup}
                onChange={e => setFollowup(e.target.value)}
              />
              <button onClick={sendFollowup} style={{ marginTop: 6 }}>
                ارسال به دستیار
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ width: 400, background: '#fff', padding: 16, borderRadius: 12 }}
            onClick={e => {
              e.stopPropagation()
            }}
          >
            <h4>آپلود سند</h4>
            <div
              onDragOver={e => {
                e.preventDefault()
                setDropActive(true)
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dropActive ? '#1f2e3b' : '#d8ccb7'}`,
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                color: '#4b4339',
                background: dropActive ? '#f0f5ff' : '#f9f4eb',
              }}
            >
              <p>سند را بکشید و رها کنید یا کلیک کنید</p>
              <input type="file" onChange={onFile} style={{ marginTop: 8 }} />
            </div>
            <button style={{ marginTop: 10 }} onClick={() => setShowModal(false)}>
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
