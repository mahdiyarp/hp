import { describe, it, expect } from 'vitest'
import { modules } from '../modules'

function requiredPermissionsFor(id: string): string[] {
  const mod = modules.find((m) => m.id === id)
  if (!mod) throw new Error(`module not found: ${id}`)
  return Array.isArray(mod.requiredPermissions) ? mod.requiredPermissions : []
}

describe('Smoke: modules registry requiredPermissions', () => {
  it('gates sensitive developer/admin modules behind settings:manage', () => {
    const gated = [
      'settings-users',
      'access-control',
      'developer',
      'page-builder',
      'dev-assistant',
      'sms-panel',
      'papi-panel',
      'audit',
    ]

    for (const id of gated) {
      expect(requiredPermissionsFor(id)).toContain('settings:manage')
    }
  })
})
