import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AppShell from '../components/layout/AppShell'

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
      <AppShell
        modules={modules}
        sync={null}
        user={{ username: 'tester', role: 'User' }}
        onLogout={() => {}}
        orgFeatures={[]}
        permissions={[]}
      />,
    )

    const headerRightContainer = container.querySelector('header .hp-container.hp-container-right')
    expect(headerRightContainer).toBeTruthy()

    const mainRightContainer = container.querySelector('main .hp-container.hp-container-right')
    expect(mainRightContainer).toBeTruthy()
  })
})
