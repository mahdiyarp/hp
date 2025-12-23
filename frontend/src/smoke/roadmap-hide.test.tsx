import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock auth service to simulate Roadmap 404
vi.mock('../services/auth', () => ({
  fetchWithAuth: async () => ({ status: 404, ok: false, json: async () => ({}) }),
}))

import RoadmapModule from '../modules/RoadmapModule'

describe('Smoke: Roadmap hidden on 404', () => {
  it('renders nothing when /api/roadmap returns 404', async () => {
    const { container } = render(
      // minimal props for ModuleComponentProps
      // RoadmapModule only uses onNavigate; other props are ignored in this component
      React.createElement(RoadmapModule as any, {
        onNavigate: () => {},
        smartDate: { isoDate: null, jalali: null },
        onSmartDateChange: () => {},
        sync: null,
        user: null,
      })
    )

    // Wait for effect to run and hidden state to apply
    await waitFor(() => {
      // Expect container to be empty (null render)
      expect(container.firstChild).toBeNull()
      // No Roadmap headings present
      expect(screen.queryByText(/Roadmap|Planning Console/i)).toBeNull()
    })
  })
})
