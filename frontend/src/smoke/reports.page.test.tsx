import { render, screen } from '@testing-library/react'
import React from 'react'
import Reports from '../pages/Reports'

vi.mock('../services/api', () => ({
  apiGet: vi.fn(async () => ({
    items: [
      { date: '1404-01-01', customer: 'مشتری الف', total: 12345, status: 'final' },
      { date: '1404-01-02', customer: 'مشتری ب', amount: 5000, status: 'paid' },
    ],
  })),
}))

describe('Reports page', () => {
  it('renders table headers and a couple of rows', async () => {
    render(<Reports />)
    expect(await screen.findByText('گزارشات')).toBeInTheDocument()
    expect(await screen.findByText('مشتری الف')).toBeInTheDocument()
    expect(await screen.findByText('مشتری ب')).toBeInTheDocument()
  })
})
