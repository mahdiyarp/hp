import React, { createContext, useContext, useEffect, useState } from 'react'
import authService, { clearTokens } from '../services/auth'

type User = { id: number; username: string; role: string; otp_enabled: boolean }

const AuthContext = createContext<{
  user: User | null
  setUser: (u: User | null) => void
  login: (u: string, p: string, otp?: string) => Promise<{ otpRequired: boolean }>
  logout: () => void
}>({ user: null, setUser: () => {}, login: async () => ({ otpRequired: false }), logout: () => {} })

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // try to fetch /api/auth/me
    async function load() {
      try {
        const res = await authService.fetchWithAuth('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        setUser({ id: data.id, username: data.username, role: data.role, otp_enabled: data.otp_enabled })
      } catch (e) {
        setUser(null)
      }
    }
    load()
  }, [])

  const login = async (u: string, p: string, otp?: string) => {
    const result = await authService.login(u, p, otp)
    if ('otpRequired' in result && result.otpRequired) {
      return { otpRequired: true }
    }
    // fetch user
    const res = await authService.fetchWithAuth('/api/auth/me')
    if (res.ok) {
      const d = await res.json()
      setUser({ id: d.id, username: d.username, role: d.role, otp_enabled: d.otp_enabled })
    }
    return { otpRequired: false }
  }

  const logout = () => {
    authService
      .fetchWithAuth('/api/auth/logout', { method: 'POST' })
      .catch(() => null)
      .finally(() => {
        clearTokens()
        setUser(null)
      })
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>
  )
}
