import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import authService, {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../services/auth'
import { modules as moduleDefinitions } from '../modules'
import {
  DEMO_MODULE_IDS,
  DEMO_PERMISSIONS,
  DEMO_USER,
  isFrontendOnlyMode,
} from '../services/mockApi'

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

  const developerRoles = new Set(['Developer', 'Developer NFT'])
  const allModuleIds = useMemo(() => moduleDefinitions.map((m) => m.id), [])

  const withDeveloperModules = (roleName: string | null | undefined, list: string[]) => {
    if (roleName && developerRoles.has(roleName)) {
      return Array.from(new Set([...list, ...allModuleIds]))
    }
    return list
  }

  useEffect(() => {
    if (isFrontendOnlyMode) {
      const demoAccess = `${DEMO_USER.username}-access`
      const demoRefresh = `${DEMO_USER.username}-refresh`
      if (!getAccessToken()) {
        setTokens(demoAccess, demoRefresh)
      }
      setUser({ ...DEMO_USER })
      setModules([...DEMO_MODULE_IDS])
      setPermissions(
        DEMO_PERMISSIONS.map((name, idx) => ({
          id: 8000 + idx,
          name,
          description: `مجوز ${name}`,
          module: 'demo',
        })),
      )
      try {
        localStorage.setItem('hesabpak_user_id', String(DEMO_USER.id))
      } catch {}
      return
    }
    // try to fetch /api/auth/me
    async function load() {
      // Gate network calls until توکن داریم
      const hasAnyToken = !!getAccessToken() || !!getRefreshToken()
      if (!hasAnyToken) return
      try {
        let meResp = await authService.fetchWithAuth('/api/auth/me')
        if (!meResp.ok) {
          if (meResp.status === 401 && getAccessToken()) {
            await new Promise((r) => setTimeout(r, 300))
            meResp = await authService.fetchWithAuth('/api/auth/me')
            if (!meResp.ok) return
          } else {
            return
          }
        }
        const data = await meResp.json()
        setUser({
          id: data.id,
          username: data.username,
          role: data.role,
          otp_enabled: data.otp_enabled,
        })
        try {
          localStorage.setItem('hesabpak_user_id', String(data.id))
        } catch {}

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
          setModules(withDeveloperModules(data?.role, finalMods))
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
    if (isFrontendOnlyMode) {
      const demoAccess = `${DEMO_USER.username}-access`
      const demoRefresh = `${DEMO_USER.username}-refresh`
      setTokens(demoAccess, demoRefresh)
      setUser({ ...DEMO_USER })
      setModules([...DEMO_MODULE_IDS])
      setPermissions(
        DEMO_PERMISSIONS.map((name, idx) => ({
          id: 8100 + idx,
          name,
          description: `مجوز ${name}`,
          module: 'demo',
        })),
      )
      return { otpRequired: false }
    }
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
        setModules(withDeveloperModules(d.role, finalMods))
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
    if (isFrontendOnlyMode) {
      const demoAccess = `${DEMO_USER.username}-access`
      const demoRefresh = `${DEMO_USER.username}-refresh`
      setTokens(demoAccess, demoRefresh)
      setUser({ ...DEMO_USER })
      setModules([...DEMO_MODULE_IDS])
      setPermissions(
        DEMO_PERMISSIONS.map((name, idx) => ({
          id: 8200 + idx,
          name,
          description: `مجوز ${name}`,
          module: 'demo',
        })),
      )
      return { needsOtp: false }
    }
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
        const finalMods = Array.isArray(mods) ? mods : []
        setModules(withDeveloperModules(d.role, finalMods))
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
    if (isFrontendOnlyMode) {
      clearTokens()
      setUser(null)
      setModules([])
      setPermissions([])
      return
    }
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
