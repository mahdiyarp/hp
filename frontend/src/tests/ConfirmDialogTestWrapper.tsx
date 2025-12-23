import React from 'react'
import { ConfirmDialogProvider } from '../context/ConfirmDialogContext'

interface Props {
  children: React.ReactNode
}

export function ConfirmDialogTestWrapper({ children }: Props) {
  return <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
}
