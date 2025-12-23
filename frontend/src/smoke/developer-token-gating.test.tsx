import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AppShell from '../components/layout/AppShell'
import { ConfirmDialogTestWrapper } from '../tests/ConfirmDialogTestWrapper'

vi.mock('../components/StatusBar', () => ({
  default: () => <div />,
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fa', dir: 'rtl' }),
}))

const FakeModule: React.FC<any> = () => <div>FAKE REPORTS MODULE</div>

function base64urlEncodeJson(obj: any): string {
  const json = JSON.stringify(obj)
  const b64 = btoa(json)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function makeJwt(payload: any): string {
  const header = base64urlEncodeJson({ alg: 'none', typ: 'JWT' })
  const body = base64urlEncodeJson(payload)
  return `${header}.${body}.` // unsigned token; only used for UI gating
}

describe('Smoke: Developer gating by token', () => {
  const accessKey = 'hesabpak_access_token'
  const refreshKey = 'hesabpak_refresh_token'

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.removeItem(accessKey)
    localStorage.removeItem(refreshKey)
  })

  it('shows modules even when permissions are missing if token indicates developer', async () => {
    localStorage.setItem(accessKey, makeJwt({ sub: 'developer', role: 'User' }))
    localStorage.setItem(refreshKey, 'R')

    await act(async () => {
      render(
        <ConfirmDialogTestWrapper>
          <AppShell
            modules={[
              {
                id: 'reports',
                label: 'گزارش‌ها و تحلیل‌ها',
                description: '...',
                component: FakeModule as any,
                badge: 'REPORTS',
                feature: 'reports',
                requiredPermissions: ['reports:view'],
              },
            ] as any}
            sync={null}
            user={{ username: 'u', role: 'User' }}
            onLogout={() => {}}
            orgFeatures={[]}
            permissions={[]}
          />
        </ConfirmDialogTestWrapper>,
      )
    })

    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('button', { name: /گزارش‌ها و تحلیل‌ها/ })).toBeInTheDocument()
  })
})
