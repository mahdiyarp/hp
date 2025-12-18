import { render, screen } from '@testing-library/react'
import React from 'react'
import Tasks from '../pages/Tasks'

vi.mock('../services/api', () => ({
  apiGet: vi.fn(async () => ({ items: [{ id: 10, title: 'بررسی فاکتور', status: 'todo' }] })),
}))

describe('Tasks page', () => {
  it('renders tasks table and a sample task', async () => {
    render(<Tasks />)
    expect(await screen.findByText('وظایف')).toBeInTheDocument()
    expect(await screen.findByText('بررسی فاکتور')).toBeInTheDocument()
  })
})
