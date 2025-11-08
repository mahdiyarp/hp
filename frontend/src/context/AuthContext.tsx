import React, { createContext, useContext, useEffect, useState } from 'react'
import authService, { clearTokens } from '../services/auth'

type User = { id: number; username: string; role: string }

const AuthContext = createContext<{
  user: User | null
  setUser: (u: User | null) => void
  login: (u: string, p: string) => Promise<void>
  logout: () => void
}>({ user: null, setUser: () => {}, login: async () => {}, logout: () => {} })

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
        setUser({ id: data.id, username: data.username, role: data.role })
      } catch (e) {
        setUser(null)
      }
    }
    load()
  }, [])

  const login = async (u: string, p: string) => {
    await authService.login(u, p)
    // fetch user
    const res = await authService.fetchWithAuth('/api/auth/me')
    if (res.ok) {
      const d = await res.json()
      setUser({ id: d.id, username: d.username, role: d.role })
    }
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>
  )
}
