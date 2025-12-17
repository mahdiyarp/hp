import React from 'react'
import { retroPanel, retroHeading, retroButton, retroMuted } from './retroTheme'

type ErrorBoundaryState = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    try {
      // Optionally log to a monitoring endpoint later
      console.error('UI ErrorBoundary caught', { error, info })
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`${retroPanel} p-6 space-y-2`}>
          <p className={`${retroHeading} text-[#7a6b4f]`}>بروز خطا در رابط کاربری</p>
          <p className={`${retroMuted}`}>لطفاً صفحه را رفرش کنید یا به ماژول دیگری بروید.</p>
          <button className={`${retroButton}`} onClick={() => window.location.reload()}>بارگذاری مجدد</button>
        </div>
      )
    }
    return this.props.children as React.ReactElement
  }
}
