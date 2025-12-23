import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import AppShell from '../components/layout/AppShell'
import { ConfirmDialogTestWrapper } from '../tests/ConfirmDialogTestWrapper'

vi.mock('../components/StatusBar', () => ({
  default: () => <div />,
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fa', dir: 'rtl' }),
}))

function DummyModule() {
  return <div>ماژول آزمایشی</div>
}

const modules = [
  {
    id: 'dummy',
    label: 'ماژول آزمایشی',
    description: 'برای تست چینش هدر',
    component: DummyModule,
  },
]

describe('Header alignment (RTL right-anchored)', () => {
  it('uses right-anchored container in header and main', () => {
    const { container } = render(
      <ConfirmDialogTestWrapper>
        <AppShell
          modules={modules}
          sync={null}
          user={{ username: 'tester', role: 'User' }}
          onLogout={() => {}}
          orgFeatures={[]}
          permissions={[]}
        />
      </ConfirmDialogTestWrapper>,
    )

    const headerRightContainer = container.querySelector('[data-testid="hp-header-container"]')
    expect(headerRightContainer).toBeTruthy()

    const mainRightContainer = container.querySelector('[data-testid="hp-main-container"]')
    expect(mainRightContainer).toBeTruthy()
  })
})
