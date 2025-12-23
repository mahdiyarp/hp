import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const roadmapPayload = {
  title: 'HesabPak Roadmap',
  updated_at: '2025-12-23T00:00:00Z',
  markdown: '# Roadmap\n',
  sections: [
    {
      title: 'Phase 1',
      bodyText: 'Intro',
      checklists: [
        { text: 'Task A', done: true },
        { text: 'Task B', done: false },
      ],
    },
  ],
}

// Mock auth service to simulate successful roadmap fetch
vi.mock('../services/auth', () => ({
  fetchWithAuth: vi.fn(async () => ({
    status: 200,
    ok: true,
    json: async () => roadmapPayload,
  })),
  loginDeveloper: vi.fn(async () => {}),
}))

import RoadmapModule from '../modules/RoadmapModule'

describe('Smoke: Roadmap renders on 200', () => {
  it('renders roadmap title and sections when /api/roadmap returns 200', async () => {
    render(
      React.createElement(RoadmapModule as any, {
        onNavigate: () => {},
        smartDate: { isoDate: null, jalali: null },
        onSmartDateChange: () => {},
        sync: null,
        user: null,
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/Planning Console/i)).toBeInTheDocument()
      expect(screen.getByText(/HesabPak Roadmap/i)).toBeInTheDocument()
      expect(screen.getByText(/Phase 1/i)).toBeInTheDocument()
      expect(screen.getByText(/Task A/i)).toBeInTheDocument()
    })
  })
})
