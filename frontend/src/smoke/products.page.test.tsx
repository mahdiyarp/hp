import { render, screen } from '@testing-library/react'
import React from 'react'
import Products from '../pages/Products'

vi.mock('../services/api', () => ({
  apiGet: vi.fn(async () => [
    { id: 1, name: 'کالای A', sku: 'A-1', price: 1000, stock: 5 },
    { id: 2, name: 'کالای B', sku: 'B-2', price: 2000, stock: 0 },
  ]),
}))

describe('Products page', () => {
  it('renders list of products and header', async () => {
    render(<Products />)
    expect(await screen.findByText('کالاها')).toBeInTheDocument()
    expect(await screen.findByText('کالای A')).toBeInTheDocument()
    expect(await screen.findByText('کالای B')).toBeInTheDocument()
  })
})
