import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { SmartControlCenterCard } from './sections'

describe('SmartControlCenterCard', () => {
  it('renders operator readiness summary, status, and next action from readiness endpoint data', () => {
    render(
      <SmartControlCenterCard
        theme="dark"
        wsConnected
        healthScore={84}
        status={{ status: 'online', assistant: { model_name: 'qwen3.5:9b' } } as any}
        selfCompletionData={{ auto_loop_active: true } as any}
        checksLastData={{
          ok: true,
          summary: {
            timestamp: new Date().toISOString(),
            all_ok: true,
            checks: [{ name: 'health', ok: true }],
          },
        }}
        missionAuditData={{
          ok: true,
          done_count: 5,
          total: 6,
          all_done: false,
          capabilities: [{ id: 1, title: 'تست', done: false }],
        }}
        operatorReadinessData={{
          ok: true,
          score: 95,
          status: 'ready',
          status_fa: 'آماده',
          summary: 'سیستم آماده عملیات روزانه است',
          next_action: 'اجرای پایش روزانه از داشبورد',
          done_count: 6,
          total: 6,
        }}
        aiHpBootstrapPending={false}
        pending={{
          selfCompletion: false,
          modelSwitch: false,
          snapshot: false,
          stabilize: false,
          checks: false,
        }}
        onRunSelfCompletion={vi.fn()}
        onSwitchRecommendedModel={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onQuickStabilize={vi.fn()}
        onRunChecks={vi.fn()}
        onRunDeepChecks={vi.fn()}
        onRunAiHpBootstrap={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    )

    expect(screen.getByText(/آمادگی اپراتور: 6\/6 \(آماده\)/)).toBeInTheDocument()
    expect(screen.getByText(/امتیاز آمادگی: 95/)).toBeInTheDocument()
    expect(screen.getByTestId('operator-readiness-score')).toHaveClass('text-emerald-300')
    expect(screen.getByText(/خلاصه وضعیت: سیستم آماده عملیات روزانه است/)).toBeInTheDocument()
    expect(screen.getByText(/اقدام بعدی: اجرای پایش روزانه از داشبورد/)).toBeInTheDocument()
  })

  it('falls back to mission audit progress and first missing capability when readiness data is unavailable', () => {
    render(
      <SmartControlCenterCard
        theme="dark"
        wsConnected={false}
        healthScore={62}
        status={{ status: 'online', assistant: { model_name: 'qwen3.5:9b' } } as any}
        selfCompletionData={{ auto_loop_active: false } as any}
        checksLastData={{
          ok: true,
          summary: {
            timestamp: new Date().toISOString(),
            all_ok: false,
            checks: [{ name: 'health', ok: false }],
          },
        }}
        missionAuditData={{
          ok: true,
          done_count: 4,
          total: 6,
          all_done: false,
          capabilities: [
            { id: 1, title: 'مدیریت خطا', done: false },
            { id: 2, title: 'پایش', done: true },
          ],
        }}
        operatorReadinessData={undefined}
        aiHpBootstrapPending={false}
        pending={{
          selfCompletion: false,
          modelSwitch: false,
          snapshot: false,
          stabilize: false,
          checks: false,
        }}
        onRunSelfCompletion={vi.fn()}
        onSwitchRecommendedModel={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onQuickStabilize={vi.fn()}
        onRunChecks={vi.fn()}
        onRunDeepChecks={vi.fn()}
        onRunAiHpBootstrap={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    )

    expect(screen.getByText(/آمادگی اپراتور: 4\/6 \(در حال انجام\)/)).toBeInTheDocument()
    expect(screen.getByText(/اقدام بعدی: مدیریت خطا/)).toBeInTheDocument()
  })

  it('uses warning tone for low readiness score', () => {
    render(
      <SmartControlCenterCard
        theme="dark"
        wsConnected
        healthScore={50}
        status={{ status: 'online', assistant: { model_name: 'qwen3.5:9b' } } as any}
        selfCompletionData={{ auto_loop_active: false } as any}
        checksLastData={undefined}
        missionAuditData={{
          ok: true,
          done_count: 2,
          total: 6,
          all_done: false,
          capabilities: [{ id: 1, title: 'پایش', done: false }],
        }}
        operatorReadinessData={{
          ok: true,
          score: 42,
          status: 'needs_attention',
          status_fa: 'نیازمند توجه',
          summary: 'هشدار عملیاتی',
          next_action: 'اجرای چک عمیق',
          done_count: 2,
          total: 6,
        }}
        aiHpBootstrapPending={false}
        pending={{
          selfCompletion: false,
          modelSwitch: false,
          snapshot: false,
          stabilize: false,
          checks: false,
        }}
        onRunSelfCompletion={vi.fn()}
        onSwitchRecommendedModel={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onQuickStabilize={vi.fn()}
        onRunChecks={vi.fn()}
        onRunDeepChecks={vi.fn()}
        onRunAiHpBootstrap={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    )

    expect(screen.getByText(/امتیاز آمادگی: 42/)).toBeInTheDocument()
    expect(screen.getByTestId('operator-readiness-score')).toHaveClass('text-rose-300')
  })

  it('uses warning tone for medium readiness score', () => {
    render(
      <SmartControlCenterCard
        theme="dark"
        wsConnected
        healthScore={65}
        status={{ status: 'online', assistant: { model_name: 'qwen3.5:9b' } } as any}
        selfCompletionData={{ auto_loop_active: true } as any}
        checksLastData={undefined}
        missionAuditData={{
          ok: true,
          done_count: 4,
          total: 6,
          all_done: false,
          capabilities: [{ id: 1, title: 'پایش', done: false }],
        }}
        operatorReadinessData={{
          ok: true,
          score: 70,
          status: 'warning',
          status_fa: 'نیازمند توجه',
          summary: 'نیازمند بررسی',
          next_action: 'اجرای چک سریع',
          done_count: 4,
          total: 6,
        }}
        aiHpBootstrapPending={false}
        pending={{
          selfCompletion: false,
          modelSwitch: false,
          snapshot: false,
          stabilize: false,
          checks: false,
        }}
        onRunSelfCompletion={vi.fn()}
        onSwitchRecommendedModel={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onQuickStabilize={vi.fn()}
        onRunChecks={vi.fn()}
        onRunDeepChecks={vi.fn()}
        onRunAiHpBootstrap={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    )

    expect(screen.getByText(/امتیاز آمادگی: 70/)).toBeInTheDocument()
    expect(screen.getByTestId('operator-readiness-score')).toHaveClass('text-amber-300')
  })

  it('normalizes readiness score before rendering (round + clamp)', () => {
    render(
      <SmartControlCenterCard
        theme="dark"
        wsConnected
        healthScore={88}
        status={{ status: 'online', assistant: { model_name: 'qwen3.5:9b' } } as any}
        selfCompletionData={{ auto_loop_active: true } as any}
        checksLastData={undefined}
        missionAuditData={{
          ok: true,
          done_count: 6,
          total: 6,
          all_done: true,
          capabilities: [],
        }}
        operatorReadinessData={{
          ok: true,
          score: 101.7,
          status: 'ready',
          status_fa: 'آماده',
          summary: 'نرمال سازی امتیاز',
          next_action: 'بدون اقدام',
          done_count: 6,
          total: 6,
        }}
        aiHpBootstrapPending={false}
        pending={{
          selfCompletion: false,
          modelSwitch: false,
          snapshot: false,
          stabilize: false,
          checks: false,
        }}
        onRunSelfCompletion={vi.fn()}
        onSwitchRecommendedModel={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onQuickStabilize={vi.fn()}
        onRunChecks={vi.fn()}
        onRunDeepChecks={vi.fn()}
        onRunAiHpBootstrap={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    )

    expect(screen.getByText(/امتیاز آمادگی: 100/)).toBeInTheDocument()
    expect(screen.getByTestId('operator-readiness-score')).toHaveClass('text-emerald-300')
  })
})
