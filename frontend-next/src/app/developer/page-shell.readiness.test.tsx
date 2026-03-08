import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { DeveloperDashboardPageShell } from './page-shell'

describe('DeveloperDashboardPageShell readiness integration', () => {
  it('renders readiness content inside real smart control card through shell props', () => {
    render(
      <DeveloperDashboardPageShell
        rootBackground="bg-root"
        theme="dark"
        setViewMode={vi.fn()}
        viewModeBannerProps={{
          badgeClass: 'bg-blue-600',
          label: 'ساده',
          descriptionClass: 'text-slate-300',
          buttonConfigs: [{ mode: 'simple', label: 'حالت ساده', variant: 'default' }],
        }}
        simpleHintDisplayItems={[]}
        summaryTileDisplayItems={[]}
        dashboardLayout={{
          gridClassName: 'grid grid-cols-2 gap-3',
          columns: [[{ id: 'col-a-1', node: <div>sample-card</div> }], []],
        }}
        headerCardProps={{
          theme: 'dark',
          status: { status: 'online', assistant: { model_name: 'qwen3.5:9b' }, ts: new Date().toISOString() },
          wsConnected: true,
          statusLoading: false,
          onToggleTheme: vi.fn(),
          onRefresh: vi.fn(),
        }}
        footerBarProps={{ theme: 'dark', ts: new Date().toISOString() }}
        smartControlCenterCardProps={{
          theme: 'dark',
          wsConnected: true,
          healthScore: 91,
          status: { status: 'online', assistant: { model_name: 'qwen3.5:9b' } },
          selfCompletionData: { auto_loop_active: true },
          checksLastData: {
            ok: true,
            summary: {
              timestamp: new Date().toISOString(),
              all_ok: true,
              checks: [{ name: 'health', ok: true }],
            },
          },
          missionAuditData: {
            ok: true,
            done_count: 5,
            total: 6,
            all_done: false,
            capabilities: [{ id: 1, title: 'آماده سازی', done: false }],
          },
          operatorReadinessData: {
            ok: true,
            score: 100,
            status: 'ready',
            status_fa: 'آماده',
            summary: 'همه چیز آماده بهره برداری است',
            next_action: 'فقط پایش روزانه را اجرا کن',
            done_count: 6,
            total: 6,
          },
          aiHpBootstrapPending: false,
          pending: {
            selfCompletion: false,
            modelSwitch: false,
            snapshot: false,
            stabilize: false,
            checks: false,
          },
          onRunSelfCompletion: vi.fn(),
          onSwitchRecommendedModel: vi.fn(),
          onCreateSnapshot: vi.fn(),
          onQuickStabilize: vi.fn(),
          onRunChecks: vi.fn(),
          onRunDeepChecks: vi.fn(),
          onRunAiHpBootstrap: vi.fn(),
          onOpenAdvanced: vi.fn(),
        }}
      />,
    )

    expect(screen.getByText(/آمادگی اپراتور: 6\/6 \(آماده\)/)).toBeInTheDocument()
    expect(screen.getByText(/امتیاز آمادگی: 100/)).toBeInTheDocument()
    expect(screen.getByTestId('operator-readiness-score')).toHaveClass('text-emerald-300')
    expect(screen.getByText(/خلاصه وضعیت: همه چیز آماده بهره برداری است/)).toBeInTheDocument()
    expect(screen.getByText(/اقدام بعدی: فقط پایش روزانه را اجرا کن/)).toBeInTheDocument()
  })
})
