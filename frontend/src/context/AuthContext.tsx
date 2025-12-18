import React, { createContext, useContext, useEffect, useState } from 'react'
import authService, { clearTokens, getAccessToken, getRefreshToken } from '../services/auth'

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
  loginPhone: (
    mobile: string,
    otpCode?: string,
    sessionId?: string,
  ) => Promise<{ needsOtp: boolean }>
  logout: () => void
}>({
  user: null,
  setUser: () => {},
  modules: [],
  permissions: [],
  login: async () => ({ otpRequired: false }),
  loginPhone: async () => ({ needsOtp: true }),
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [modules, setModules] = useState<string[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  useEffect(() => {
    // try to fetch /api/auth/me
    async function load() {
      // Gate network calls until توکن داریم
      const hasAnyToken = !!getAccessToken() || !!getRefreshToken()
      if (!hasAnyToken) return
      try {
        const res = await authService.fetchWithAuth('/api/auth/me')
        if (!res.ok) {
          // If unauthorized but we have a token, retry once shortly
          if (res.status === 401 && getAccessToken()) {
            await new Promise((r) => setTimeout(r, 300))
            const retry = await authService.fetchWithAuth('/api/auth/me')
            if (!retry.ok) return
            const data = await retry.json()
            setUser({
              id: data.id,
              username: data.username,
              role: data.role,
              otp_enabled: data.otp_enabled,
            })
            try {
              localStorage.setItem('hesabpak_user_id', String(data.id))
            } catch {}
          } else {
            return
          }
        } else {
          const data = await res.json()
          setUser({
            id: data.id,
            username: data.username,
            role: data.role,
            otp_enabled: data.otp_enabled,
          })
          try {
            localStorage.setItem('hesabpak_user_id', String(data.id))
          } catch {}
        }

        // Fetch user's modules and permissions with light retry
        const modsRes = await authService.fetchWithAuth('/api/current-user/modules')
        if (!modsRes.ok && modsRes.status === 401 && getAccessToken()) {
          await new Promise((r) => setTimeout(r, 300))
        }
        const modsRes2 = modsRes.ok
          ? modsRes
          : await authService.fetchWithAuth('/api/current-user/modules')
        if (modsRes2.ok) {
          const mods = await modsRes2.json()
          const finalMods = Array.isArray(mods) ? mods : []
          setModules(finalMods)
          try {
            console.debug('[Auth] loaded user role/modules', { modules: finalMods })
          } catch {}
        }

        const permsRes = await authService.fetchWithAuth('/api/current-user/permissions')
        const permsFinal = permsRes.ok
          ? permsRes
          : permsRes.status === 401 && getAccessToken()
            ? await (async () => {
                await new Promise((r) => setTimeout(r, 300))
                return authService.fetchWithAuth('/api/current-user/permissions')
              })()
            : null
        if (permsFinal && permsFinal.ok) {
          const perms = await permsFinal.json()
          setPermissions(Array.isArray(perms) ? perms : [])
        }
      } catch (e) {
        setUser(null)
        setModules([])
        setPermissions([])
      }
    }
    load()
    // React to token updates via custom event to avoid full reload
    const handler = () => {
      load()
    }
    window.addEventListener('auth-updated', handler)
    // Also react to storage changes (e.g., another tab) for robustness
    const storageHandler = (e: StorageEvent) => {
      if (
        e.key &&
        (e.key.includes('hesabpak') ||
          e.key.includes('access_token') ||
          e.key.includes('refresh_token'))
      ) {
        load()
      }
    }
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('auth-updated', handler)
      window.removeEventListener('storage', storageHandler)
    }
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
      try {
        localStorage.setItem('hesabpak_user_id', String(d.id))
      } catch {}

      // Fetch user's modules and permissions
      const modsRes = await authService.fetchWithAuth('/api/current-user/modules')
      if (modsRes.ok) {
        const mods = await modsRes.json()
        const finalMods = Array.isArray(mods) ? mods : []
        setModules(finalMods)
        try {
          console.debug('[Auth] post-login user role/modules', { role: d.role, modules: finalMods })
        } catch (e) {}
      }

      const permsRes = await authService.fetchWithAuth('/api/current-user/permissions')
      if (permsRes.ok) {
        const perms = await permsRes.json()
        setPermissions(Array.isArray(perms) ? perms : [])
      }
    }
    return { otpRequired: false }
  }

  const loginPhone = async (mobile: string, otpCode?: string, sessionId?: string) => {
    if (!otpCode) {
      await authService.loginByPhoneRequest(mobile)
      return { needsOtp: true }
    }
    await authService.verifyPhoneOtp(sessionId || '', otpCode)
    const res = await authService.fetchWithAuth('/api/auth/me')
    if (res.ok) {
      const d = await res.json()
      setUser({ id: d.id, username: d.username, role: d.role, otp_enabled: d.otp_enabled })
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
    return { needsOtp: false }
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
    <AuthContext.Provider
      value={{ user, setUser, modules, permissions, login, loginPhone, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
