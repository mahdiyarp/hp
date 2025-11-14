import React, { createContext, useContext, useEffect, useState } from 'react'
import authService, { clearTokens } from '../services/auth'

type User = { id: number; username: string; role: string; otp_enabled: boolean }

interface Permission {
  id: number
  name: string
  description: string
  module: string
}

const AuthContext = createContext<{
  user: User | null
  setUser: (u: User | null) => void
  modules: string[]
  permissions: Permission[]
  login: (u: string, p: string, otp?: string) => Promise<{ otpRequired: boolean }>
  logout: () => void
}>({ 
  user: null, 
  setUser: () => {}, 
  modules: [], 
  permissions: [],
  login: async () => ({ otpRequired: false }), 
  logout: () => {} 
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [modules, setModules] = useState<string[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  useEffect(() => {
    // try to fetch /api/auth/me
    async function load() {
      try {
        const res = await authService.fetchWithAuth('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        setUser({ id: data.id, username: data.username, role: data.role, otp_enabled: data.otp_enabled })
        
        // Fetch user's modules and permissions
        const modsRes = await authService.fetchWithAuth('/api/current-user/modules')
        if (modsRes.ok) {
          const mods = await modsRes.json()
          setModules(Array.isArray(mods) ? mods : [])
        }
        
        const permsRes = await authService.fetchWithAuth('/api/current-user/permissions')
        if (permsRes.ok) {
          const perms = await permsRes.json()
          setPermissions(Array.isArray(perms) ? perms : [])
        }
      } catch (e) {
        setUser(null)
        setModules([])
        setPermissions([])
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
      
      // Fetch user's modules and permissions
      const modsRes = await authService.fetchWithAuth('/api/current-user/modules')
      if (modsRes.ok) {
        const mods = await modsRes.json()
        setModules(Array.isArray(mods) ? mods : [])
      }
      
      const permsRes = await authService.fetchWithAuth('/api/current-user/permissions')
      if (permsRes.ok) {
        const perms = await permsRes.json()
        setPermissions(Array.isArray(perms) ? perms : [])
      }
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
        setModules([])
        setPermissions([])
      })
  }

  return (
    <AuthContext.Provider value={{ user, setUser, modules, permissions, login, logout }}>{children}</AuthContext.Provider>
  )
}
