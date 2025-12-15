import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import App from '../../../App';
import { ThemeProvider } from '../../../context/theme';

function mockFetchRoutes() {
  vi.stubGlobal('fetch', ((input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/sms/metrics/daily')) {
      return Promise.resolve(new Response(JSON.stringify({ items: [
        { day: '2025-12-09', count: 5, avg_latency_ms: 120 },
        { day: '2025-12-10', count: 3, avg_latency_ms: 90 },
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as any);
}

describe('Theme and date filters', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    try { localStorage.setItem('theme', 'dark'); } catch {}
  });

  it('applies dark theme based on localStorage', async () => {
    mockFetchRoutes();
    render(<ThemeProvider><App /></ThemeProvider>);
    // wait for ThemeProvider effect
    await new Promise(r => setTimeout(r, 0));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
