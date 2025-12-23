import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppShell from '../components/layout/AppShell'
import { ConfirmDialogTestWrapper } from '../tests/ConfirmDialogTestWrapper'

vi.mock('../components/StatusBar', () => ({
  default: () => <div />,
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fa', dir: 'rtl' }),
}))

// Minimal fake module requiring a permission
const FakeModule: React.FC<any> = () => <div>FAKE REPORTS MODULE</div>

const modules = [
  {
    id: 'reports',
    label: 'گزارش‌ها و تحلیل‌ها',
    description: 'سود و زیان، تراز نقدی و ارزش موجودی',
    component: FakeModule as any,
    badge: 'REPORTS',
    feature: 'reports',
    requiredPermissions: ['reports:view'],
  },
]

describe('Smoke: Permissions gating in AppShell', () => {
  it('hides module when permission is missing', () => {
    render(
      <ConfirmDialogTestWrapper>
        <AppShell
          modules={modules as any}
          sync={null}
          user={{ username: 'u', role: 'User' }}
          onLogout={() => {}}
          orgFeatures={['reports']}
          permissions={[]}
        />
      </ConfirmDialogTestWrapper>,
    )
    expect(screen.queryByText('گزارش‌ها و تحلیل‌ها')).toBeNull()
  })

  it('shows module when required permission is present', () => {
    render(
      <ConfirmDialogTestWrapper>
        <AppShell
          modules={modules as any}
          sync={null}
          user={{ username: 'u', role: 'User' }}
          onLogout={() => {}}
          orgFeatures={['reports']}
          permissions={['reports:view']}
        />
      </ConfirmDialogTestWrapper>,
    )
    expect(screen.getByText('گزارش‌ها و تحلیل‌ها')).toBeDefined()
  })
})
