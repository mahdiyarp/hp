import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginForm() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(username, password)
    } catch (err) {
      setError('ورود ناموفق')
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm">
      <div className="mb-2">
        <label className="block mb-1">نام کاربری</label>
        <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border px-2 py-1 rounded" />
      </div>
      <div className="mb-2">
        <label className="block mb-1">رمز عبور</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border px-2 py-1 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">ورود</button>
        {error && <div className="text-red-600">{error}</div>}
      </div>
    </form>
  )
}
