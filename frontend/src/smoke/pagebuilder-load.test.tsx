import React from 'react'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('grapesjs', () => {
  const editor = {
    BlockManager: { add: vi.fn() },
    setComponents: vi.fn(),
    setStyle: vi.fn(),
    destroy: vi.fn(),
    getHtml: vi.fn(() => '<div></div>'),
    getCss: vi.fn(() => 'body{}'),
  }

  return {
    default: {
      init: vi.fn(() => editor),
    },
  }
})

vi.mock('../services/pageBuilder', () => ({
  listPageBuilderTemplates: vi.fn(async () => []),
  savePageBuilderTemplate: vi.fn(async (payload: any) => ({
    id: 1,
    name: payload?.name ?? 'قالب جدید',
    html: payload?.html ?? '',
    css: payload?.css ?? '',
    updated_at: new Date().toISOString(),
    metadata: {},
  })),
  deletePageBuilderTemplate: vi.fn(async () => {}),
}))

vi.mock('../context/ConfirmDialogContext', () => ({
  useConfirmDialog: () => vi.fn(async () => true),
}))

import PageBuilderModule from '../modules/PageBuilderModule'

describe('Smoke: PageBuilder renders (fa/rtl)', () => {
  it('renders Persian header and actions, sets RTL container', async () => {
    const { container } = render(<PageBuilderModule />)

    await waitFor(() => {
        expect(screen.getByText('صفحه‌ساز')).toBeInTheDocument()
      expect(screen.getByText('قالب جدید')).toBeInTheDocument()
      expect(screen.getByText('ذخیره قالب')).toBeInTheDocument()
    })

    expect(container.querySelector('[dir="rtl"]')).toBeTruthy()
  })
})
