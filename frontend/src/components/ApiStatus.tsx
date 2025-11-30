import React from 'react'

const ApiStatus: React.FC = () => {
  const [ok, setOk] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let mounted = true
    const ctrl = new AbortController()
    fetch('/openapi.json', { signal: ctrl.signal })
      .then((r) => setOk(r.ok))
      .catch(() => setOk(false))
    return () => {
      mounted = false
      ctrl.abort()
    }
  }, [])

  const cls = ok === null ? 'hp-badge warning' : ok ? 'hp-badge success' : 'hp-badge error'
  const label = ok === null ? 'در حال بررسی API' : ok ? 'API آنلاین' : 'API آفلاین'

  return <span className={cls}>{label}</span>
}

export default ApiStatus
