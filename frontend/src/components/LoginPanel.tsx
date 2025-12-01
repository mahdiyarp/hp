import React from 'react'
import { login as loginApi, getAccessToken } from '../services/auth'

type MeResponse = {
  username?: string
  email?: string
  full_name?: string
}

const LoginPanel: React.FC = () => {
  const [username, setUsername] = React.useState('admin')
  const [password, setPassword] = React.useState('Admin@123')
  const [me, setMe] = React.useState<MeResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${getAccessToken() || ''}`,
        },
      })
      if (!res.ok) {
        setMe(null)
        return
      }
      const data = (await res.json()) as MeResponse
      setMe(data)
    } catch {
      setMe(null)
    }
  }

  React.useEffect(() => {
    fetchMe()
  }, [])

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await loginApi(username, password)
      if (result?.access_token) {
        await fetchMe()
      } else if (result?.otpRequired) {
        setError('OTP لازم است')
      } else {
        setError('ورود ناموفق')
      }
    } catch (err: any) {
      setError(err?.message || 'خطای ورود')
    } finally {
      setLoading(false)
    }
  }

  if (me && me.username) {
    return (
      <div className="hp-badge success" title={me.email || ''}>
        کاربر فعال: {me.full_name || me.username}
      </div>
    )
  }

  return (
    <form onSubmit={onLogin} className="flex items-center gap-2">
      <input
        className="hp-input w-36"
        placeholder="نام کاربری"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="hp-input w-36"
        type="password"
        placeholder="رمز عبور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="hp-button" disabled={loading}>
        {loading ? '...' : 'ورود'}
      </button>
      {error ? <span className="hp-badge error">{error}</span> : null}
    </form>
  )
}

export default LoginPanel
